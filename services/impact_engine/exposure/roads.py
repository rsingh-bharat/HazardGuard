"""
Road exposure aggregation.
"""
from typing import List, Dict, Any

def evaluate_road_exposure_summary(road_evaluations: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_km = sum(len(r.get("geometry", {}).get("coordinates", [])) * 0.8 for r in road_evaluations)
    affected = [r for r in road_evaluations if r.get("water_depth_m", 0.0) >= 0.10]
    critical_impassable = [r for r in road_evaluations if r.get("water_depth_m", 0.0) >= 0.35]

    return {
        "total_roads_assessed": len(road_evaluations),
        "affected_roads_count": len(affected),
        "impassable_roads_count": len(critical_impassable),
        "total_lane_km_assessed": round(total_km, 1),
        "max_road_depth_m": max([r.get("water_depth_m", 0.0) for r in road_evaluations]) if road_evaluations else 0.0
    }
