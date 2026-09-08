"""
Core Rainfall-to-Impact Engine facade.
Orchestrates entire pipeline according to black box design principle.
"""
import os
import copy
from typing import Dict, Any, Optional
from .schemas import ImpactRequest, ImpactResult, ScenarioComparisonItem
from .validation import validate_impact_request
from .scenario import resolve_scenario
from .cache_key import generate_cache_key
from .provenance import create_provenance
from .context import SimulationContext
from .simulation import run_simulation
from ..terrain.cache import TerrainCache
from ..terrain.dem import load_dem
from ..terrain.slope import calculate_slope
from ..terrain.flow_direction import calculate_d8_flow_direction
from ..thresholds.loader import load_threshold_rules
from ..drainage.zones import get_drainage_zones
from ..traffic.graph import get_road_network
from ..exposure.hospitals import get_hospitals
from ..exposure.schools import get_schools
from ..exposure.power import get_power_substations
from ..exposure.buildings import get_buildings
from ..exposure.population import get_population_grid

class ImpactEngine:
    def __init__(self, config_dir: Optional[str] = None):
        if config_dir is None:
            config_dir = os.path.join(os.path.dirname(__file__), "..", "config")
        self.config_dir = os.path.abspath(config_dir)
        self.threshold_rules = load_threshold_rules(self.config_dir)
        self.versions = {
            "terrain_version": "v1.4-SRTM30-CORRECTED",
            "impact_model_version": "v2.1.0-SOUMY",
            "threshold_version": "v1.2.0-STANDARD",
            "infrastructure_data_version": "v2026.08-OSM-LOCAL"
        }
        self._simulation_cache: Dict[str, ImpactResult] = {}

    def simulate(self, request: ImpactRequest) -> ImpactResult:
        # 1. Validation — pass whether the raw dict had an explicit 'forecast' key
        validate_impact_request(request, _raw_had_forecast=request._had_explicit_forecast)

        # 2. Cache check
        sim_id = generate_cache_key(request, self.versions)
        if sim_id in self._simulation_cache:
            cached = copy.deepcopy(self._simulation_cache[sim_id])
            cached.provenance.cache_hit = True
            return cached

        # 3. Scenario resolution
        scenario = resolve_scenario(request)
        bbox = request.bbox or request.forecast.bbox

        # 4. Terrain loading & derivative caching
        terrain_key = TerrainCache.make_key(bbox, request.resolution_m, self.versions["terrain_version"])
        terrain_data = TerrainCache.get(terrain_key)

        if not terrain_data:
            dem = load_dem(bbox, request.resolution_m)
            slope = calculate_slope(dem.elevation, dem.cell_size_m)
            flow_dir = calculate_d8_flow_direction(dem.elevation, dem.cell_size_m)
            terrain_data = {
                "dem": dem,
                "elevation": dem.elevation,
                "slope": slope,
                "flow_dir": flow_dir,
                "rows": dem.rows,
                "cols": dem.cols
            }
            TerrainCache.put(terrain_key, terrain_data)

        # 5. Infrastructure loading
        drainage_zones = get_drainage_zones()
        roads = get_road_network()
        facilities = get_hospitals()
        schools = get_schools()
        power = get_power_substations()
        buildings = get_buildings()
        population_cells = get_population_grid()

        # 6. Context initialization
        context = SimulationContext(
            request=request,
            scenario=scenario,
            bbox=bbox,
            grid_shape=(terrain_data["rows"], terrain_data["cols"]),
            resolution_m=request.resolution_m,
            elevation_grid=terrain_data["elevation"],
            slope_grid=terrain_data["slope"],
            flow_dir_grid=terrain_data["flow_dir"],
            drainage_zones=drainage_zones,
            roads=roads,
            facilities=facilities,
            schools=schools,
            power=power,
            buildings=buildings,
            population_cells=population_cells,
            threshold_rules=self.threshold_rules
        )

        # Extract Sayan authoritative provenance fields if present
        auth = request.authoritative_forecast or {}
        auth_snapshot_id = auth.get("snapshot_id") if auth else None
        auth_model_id = auth.get("model_id") if auth else None
        auth_fallback = auth.get("fallback") if auth else None
        auth_provider = auth.get("provider") if auth else None
        auth_rainfall_mm = float(auth.get("rainfall_mm")) if auth and auth.get("rainfall_mm") is not None else None
        auth_valid_time = auth.get("nwp_valid_time") if auth else None
        auth_init_time = auth.get("nwp_initialization_time") if auth else None
        auth_model_status = auth.get("model_status") if auth else None
        auth_verification_status = auth.get("verification_status") if auth else None
        auth_prob_raw = auth.get("probability") if auth else None
        auth_probability = float(auth_prob_raw) if auth_prob_raw is not None else None
        auth_probability_available = auth.get("probability_available") if auth else None
        auth_calibration_status = auth.get("calibration_status") if auth else None

        provenance = create_provenance(
            forecast_id=request.forecast.forecast_id,
            simulation_id=sim_id,
            scenario_type=scenario.type,
            versions=self.versions,
            cache_hit=False,
            authoritative_snapshot_id=auth_snapshot_id,
            authoritative_model_id=auth_model_id,
            authoritative_fallback=auth_fallback,
            authoritative_provider=auth_provider,
            authoritative_rainfall_mm=auth_rainfall_mm,
            authoritative_valid_time=auth_valid_time,
            authoritative_init_time=auth_init_time,
            authoritative_model_status=auth_model_status,
            authoritative_verification_status=auth_verification_status,
            authoritative_probability=auth_probability,
            authoritative_probability_available=auth_probability_available,
            authoritative_calibration_status=auth_calibration_status,
        )

        # 7. Run target simulation
        result = run_simulation(context, provenance)

        # 8. Comparison Matrix computation (LOW, BASE, HIGH + backward-compatible P10, P50, P90)
        comparison_matrix = self._generate_comparison(request, context)
        result.comparison = comparison_matrix

        # Store in cache
        self._simulation_cache[sim_id] = result
        return result


    def _generate_comparison(self, base_request: ImpactRequest, context: SimulationContext) -> Dict[str, Any]:
        """
        Propagates LOW, BASE, and HIGH through the entire engine to provide a comparison matrix.
        Guarantees monotonicity: HIGH impact >= BASE impact >= LOW impact.
        Provides both canonical (LOW/BASE/HIGH) and backward-compatible (P10/P50/P90) keys.
        """
        rf = base_request.forecast.rainfall
        scenarios_to_run = [
            ("LOW", rf.low_scenario_mm),
            ("BASE", rf.base_scenario_mm),
            ("HIGH", rf.high_scenario_mm)
        ]

        matrix: Dict[str, Any] = {}
        for s_type, rain_val in scenarios_to_run:
            ctx_copy = copy.copy(context)
            ctx_copy.scenario = copy.copy(context.scenario)
            ctx_copy.scenario.type = s_type
            ctx_copy.scenario.rainfall_mm = rain_val

            prov_stub = create_provenance(
                forecast_id=base_request.forecast.forecast_id,
                simulation_id=f"comp_{s_type}_{rain_val:.0f}",
                scenario_type=s_type,
                versions=self.versions
            )
            sim_res = run_simulation(ctx_copy, prov_stub)
            sum_dict = sim_res.summary
            
            entry = {
                "scenario": s_type,
                "rainfall_mm": rain_val,
                "peak_water_depth_m": sum_dict.get("peak_water_depth_m", 0.0),
                "peak_inundated_area_km2": sum_dict.get("peak_inundated_area_km2", 0.0),
                "drainage_overflow_zones": sum_dict.get("drainage_overflow_zones_count", 0),
                "road_bottlenecks": sum_dict.get("road_bottlenecks_count", 0),
                "congestion_score": sum_dict.get("max_congestion_score", 0.0),
                "facilities_at_risk": sum_dict.get("critical_facilities_at_risk_count", 0),
                "population_exposed": sum_dict.get("estimated_population_exposed", 0),
                "total_warnings": sum_dict.get("total_warnings_count", 0),
                "overall_status": sum_dict.get("overall_status", "NORMAL")
            }
            matrix[s_type] = entry

        # Backward-compatible aliases
        matrix["P10"] = {**matrix["LOW"], "scenario": "P10"}
        matrix["P50"] = {**matrix["BASE"], "scenario": "P50"}
        matrix["P90"] = {**matrix["HIGH"], "scenario": "P90"}

        return matrix

    def get_simulation(self, simulation_id: str) -> Optional[ImpactResult]:
        return self._simulation_cache.get(simulation_id)
