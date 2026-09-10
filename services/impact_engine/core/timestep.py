"""
Single timestep execution engine.
Routes rainfall -> infiltration -> runoff -> water depth -> drainage -> roads -> congestion -> exposure -> thresholds -> warnings.
"""
from typing import Dict, Any, List
from .schemas import ImpactState, ImpactWarning
from .context import SimulationContext
from ..hydrology.infiltration import calculate_infiltration_loss
from ..hydrology.runoff import calculate_runoff_excess
from ..hydrology.routing import route_runoff_flow
from ..hydrology.water_accumulation import calculate_water_accumulation
from ..hydrology.water_depth import calculate_water_depth
from ..hydrology.water_state import create_water_state
from ..drainage.load import calculate_drainage_load
from ..drainage.capacity import get_zone_capacity
from ..drainage.utilization import calculate_utilization
from ..drainage.surcharge import evaluate_surcharge
from ..drainage.overflow import identify_overflow_risk
from ..traffic.exposure import calculate_road_water_exposure
from ..traffic.capacity_reduction import calculate_capacity_reduction
from ..traffic.bottleneck import identify_bottlenecks
from ..traffic.congestion import calculate_congestion_risk
from ..exposure.hospitals import evaluate_hospital_access
from ..exposure.schools import evaluate_school_exposure
from ..exposure.power import evaluate_power_exposure
from ..exposure.buildings import evaluate_building_exposure
from ..exposure.population import estimate_population_exposure
from ..consequences.registry import registry

def execute_timestep(
    step_info: Dict[str, Any],
    context: SimulationContext
) -> ImpactState:
    timestamp = step_info["timestamp"]
    hours = step_info["hours"]
    cum_mm = step_info["cumulative_mm"]
    inc_mm = step_info["incremental_mm"]
    intensity_mm_hr = step_info["intensity_mm_hr"]
    scenario_type = context.scenario.type

    # 1. Hydrology: Infiltration
    infil_mm = calculate_infiltration_loss(
        rainfall_increment_mm=inc_mm,
        elapsed_hours=float(hours),
        timestep_hours=float(context.scenario.timestep_hours)
    )

    # 2. Runoff Excess
    runoff_coeff = context.config.get("runoff_coefficients", {}).get("default_composite_coefficient", 0.65)
    runoff_mm = calculate_runoff_excess(cum_mm, infil_mm, runoff_coeff)

    # 3. Terrain Routing
    routed_grid = route_runoff_flow(
        runoff_mm=runoff_mm,
        elevation=context.elevation_grid,
        flow_direction=context.flow_dir_grid,
        slope_grid=context.slope_grid
    )

    # 4. Water Accumulation & Depth
    accum_summary = calculate_water_accumulation(routed_grid, cell_size_m=context.resolution_m)
    depth_grid = calculate_water_depth(routed_grid, context.slope_grid)
    water_state = create_water_state(
        timestamp=timestamp,
        hours=hours,
        rainfall_accum_mm=cum_mm,
        rainfall_increment_mm=inc_mm,
        runoff_mm=runoff_mm,
        water_depth_grid=depth_grid,
        accumulation_summary=accum_summary
    )

    # 5. Drainage Evaluation
    utilizations = {}
    surcharges = {}
    for z in context.drainage_zones:
        zid = z["zone_id"]
        load = calculate_drainage_load(z, intensity_mm_hr, runoff_coefficient=runoff_coeff)
        cap = get_zone_capacity(z)
        ratio = calculate_utilization(load, cap)
        utilizations[zid] = ratio
        surcharges[zid] = evaluate_surcharge(ratio)

    overflow_zones = identify_overflow_risk(context.drainage_zones, utilizations)
    drainage_state = {
        "utilizations": utilizations,
        "surcharges": surcharges,
        "overflow_zones": overflow_zones,
        "max_utilization": max(utilizations.values()) if utilizations else 0.0,
        "stressed_zones_count": len(overflow_zones)
    }

    # 6. Road Network Evaluation
    road_evals = []
    for r in context.roads:
        exp = calculate_road_water_exposure(r, depth_grid, context.bbox)
        cap_red = calculate_capacity_reduction(exp["max_depth_m"])
        road_evals.append({
            "road_id": r["road_id"],
            "name": r["name"],
            "road_type": r.get("road_type", "ARTERIAL"),
            "importance": r.get("importance", "MEDIUM"),
            "geometry": r.get("geometry", {}),
            "water_depth_m": exp["max_depth_m"],
            "mean_depth_m": exp["mean_depth_m"],
            "inundated_fraction": exp["inundated_fraction"],
            "capacity_reduction_factor": cap_red["capacity_reduction_factor"],
            "effective_capacity_ratio": cap_red["effective_capacity_ratio"],
            "speed_reduction_pct": cap_red["speed_reduction_pct"],
            "status": cap_red["status"],
            "severity": cap_red["severity"]
        })

    bottlenecks = identify_bottlenecks(road_evals)
    congestion_state = calculate_congestion_risk(road_evals, bottlenecks)
    roads_state = {
        "road_evaluations": road_evals,
        "bottlenecks": bottlenecks,
        "affected_roads_count": sum(1 for re in road_evals if re["water_depth_m"] >= 0.10)
    }

    # 7. Asset & Population Exposure
    hosp_evals = evaluate_hospital_access(context.facilities, depth_grid, road_evals, context.bbox)
    school_evals = evaluate_school_exposure(context.schools, depth_grid, context.bbox)
    power_evals = evaluate_power_exposure(context.power, depth_grid, context.bbox)
    bld_evals = evaluate_building_exposure(context.buildings, depth_grid, context.bbox)
    pop_evals = estimate_population_exposure(context.population_cells, depth_grid, context.bbox)

    exposure_state = {
        "hospitals": hosp_evals,
        "schools": school_evals,
        "power": power_evals,
        "buildings": bld_evals,
        "population": pop_evals
    }

    # 8. Consequence Handlers & Warning Generation
    raw_state = {
        "water": water_state,
        "drainage": drainage_state,
        "roads": roads_state,
        "congestion": congestion_state,
        "exposure": exposure_state
    }

    warnings: List[ImpactWarning] = []
    for handler in registry.get_all_handlers():
        c_res = handler.evaluate(
            context=context,
            raw_state=raw_state,
            threshold_rules=context.threshold_rules,
            timestamp=timestamp,
            scenario_type=scenario_type
        )
        warnings.extend(c_res.warnings)

    return ImpactState(
        timestamp=timestamp,
        hours=hours,
        rainfall_accum_mm=cum_mm,
        rainfall_increment_mm=inc_mm,
        runoff_depth_mm=runoff_mm,
        water=water_state,
        drainage=drainage_state,
        roads=roads_state,
        congestion=congestion_state,
        exposure=exposure_state,
        warnings=warnings
    )
