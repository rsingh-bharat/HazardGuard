"""
Multi-timestep simulation orchestration and scenario runner.
"""
from typing import List, Dict, Any, Optional
from .schemas import ImpactRequest, Scenario, ImpactState, ImpactResult, Provenance
from .context import SimulationContext
from .timestep import execute_timestep
from ..hydrology.temporal_distribution import generate_temporal_distribution
from ..outputs.summary import build_simulation_summary
from ..outputs.geojson import (
    build_water_geojson,
    build_roads_geojson,
    build_drainage_geojson,
    build_facilities_geojson,
    build_warnings_geojson
)
from ..outputs.flow import build_flow_vectors_geojson

def run_simulation(
    context: SimulationContext,
    provenance: Provenance
) -> ImpactResult:
    scenario = context.scenario
    total_rainfall_mm = scenario.rainfall_mm

    # 1. Hyetograph / Timestep intervals
    time_intervals = generate_temporal_distribution(
        total_rainfall_mm=total_rainfall_mm,
        duration_hours=scenario.duration_hours,
        timestep_hours=scenario.timestep_hours
    )

    # 2. Sequential simulation
    timeline: List[ImpactState] = []
    for step_info in time_intervals:
        state = execute_timestep(step_info, context)
        timeline.append(state)

    # 3. High-level summary
    summary = build_simulation_summary(timeline, scenario.type, total_rainfall_mm)

    # 4. Final state for static layer snapshots
    final_state = timeline[-1]
    all_warnings = []
    seen = set()
    for t in timeline:
        for w in t.warnings:
            if w.id not in seen:
                seen.add(w.id)
                all_warnings.append(w)

    # 5. Spatial Artifacts (GeoJSON collections for 3D digital twin)
    artifacts = {
        "water_geojson": build_water_geojson(
            final_state.water["depth_grid_sample"],
            context.bbox,
            final_state.timestamp,
            scenario.type
        ),
        "roads_geojson": build_roads_geojson(
            final_state.roads["road_evaluations"],
            final_state.timestamp,
            scenario.type
        ),
        "drainage_geojson": build_drainage_geojson(
            context.drainage_zones,
            final_state.drainage["utilizations"],
            final_state.timestamp,
            scenario.type
        ),
        "facilities_geojson": build_facilities_geojson(
            final_state.exposure["hospitals"],
            final_state.timestamp,
            scenario.type
        ),
        "warnings_geojson": build_warnings_geojson(
            all_warnings,
            final_state.timestamp,
            scenario.type
        ),
        "flow_vectors_geojson": build_flow_vectors_geojson(
            context.flow_dir_grid,
            context.bbox
        ),
        "elevation_bounds": {
            "min_m": min(v for row in context.elevation_grid for v in row),
            "max_m": max(v for row in context.elevation_grid for v in row)
        }
    }

    return ImpactResult(
        simulation_id=provenance.simulation_id,
        forecast_id=provenance.forecast_id,
        scenario=scenario,
        summary=summary,
        timeline=timeline,
        water=final_state.water,
        drainage=final_state.drainage,
        roads=final_state.roads,
        exposure=final_state.exposure,
        warnings=all_warnings,
        artifacts=artifacts,
        provenance=provenance
    )
