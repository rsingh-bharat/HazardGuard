"""
Bottleneck identification along key transport arteries.
"""
from typing import List, Dict, Any

def identify_bottlenecks(road_evaluations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    bottlenecks: List[Dict[str, Any]] = []

    for r in road_evaluations:
        reduction = r.get("capacity_reduction_factor", 0.0)
        importance = r.get("importance", "MEDIUM")

        # Critical or High importance road with >= 30% capacity loss constitutes a choke-point
        if (importance in ["CRITICAL", "HIGH"] and reduction >= 0.30) or reduction >= 0.60:
            bottlenecks.append({
                "road_id": r["road_id"],
                "name": r["name"],
                "choke_severity": "CRITICAL" if reduction >= 0.70 else "HIGH",
                "water_depth_m": r.get("water_depth_m", 0.0),
                "capacity_loss_pct": round(reduction * 100, 1),
                "importance": importance,
                "detour_recommendation_required": reduction >= 0.50
            })

    return bottlenecks
