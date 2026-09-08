"""
Critical lifeline corridors and evacuation route transit evaluation.
"""
from typing import List, Dict, Any

def evaluate_critical_routes(road_evaluations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    corridors = []
    road_map = {r["road_id"]: r for r in road_evaluations}

    # Life-line corridor: Domlur to Bellandur Tech Hub
    route1_roads = ["RD_INTERMEDIATE_RR", "RD_KORAMANGALA_80FT", "RD_ORR_BELLANDUR"]
    r1_evals = [road_map[rid] for rid in route1_roads if rid in road_map]
    max_d1 = max([r.get("water_depth_m", 0.0) for r in r1_evals]) if r1_evals else 0.0

    corridors.append({
        "corridor_id": "CORRIDOR_CENTRAL_TO_TECH_HUB",
        "name": "Central Bengaluru to Bellandur Tech Corridor",
        "max_segment_depth_m": round(max_d1, 3),
        "passable": max_d1 < 0.30,
        "status": "PASSABLE" if max_d1 < 0.20 else ("RESTRICTED_HEAVY_ONLY" if max_d1 < 0.35 else "IMPASSABLE")
    })

    return corridors
