"""
Rainfall-induced congestion risk engine.
Outputs model-estimated rainfall-induced congestion risk (not exact vehicle count).
"""
from typing import List, Dict, Any

def calculate_congestion_risk(
    road_evaluations: List[Dict[str, Any]],
    bottlenecks: List[Dict[str, Any]]
) -> Dict[str, Any]:
    if not road_evaluations:
        return {
            "congestion_score": 0.0,
            "severity": "NORMAL",
            "affected_roads_count": 0,
            "bottlenecks_count": 0,
            "description": "Normal traffic circulation anticipated"
        }

    total_weight = 0.0
    weighted_loss = 0.0

    imp_weights = {"CRITICAL": 3.0, "HIGH": 2.0, "MEDIUM": 1.0, "LOW": 0.5}

    for r in road_evaluations:
        imp = r.get("importance", "MEDIUM")
        w = imp_weights.get(imp, 1.0)
        loss = r.get("capacity_reduction_factor", 0.0)

        total_weight += w
        weighted_loss += loss * w

    # Base congestion index 0 to 100
    avg_loss = (weighted_loss / max(0.1, total_weight))
    # Nonlinear amplification when multiple bottlenecks coincide
    bottleneck_penalty = min(30.0, len(bottlenecks) * 8.0)
    congestion_score = round(min(100.0, (avg_loss * 75.0) + bottleneck_penalty), 1)

    if congestion_score >= 70.0:
        severity = "CRITICAL"
        desc = "Severe district-wide traffic gridlock risk due to multiple drowned arterial choke-points"
    elif congestion_score >= 45.0:
        severity = "HIGH"
        desc = "High congestion risk; extensive vehicle rerouting and secondary corridor spillover"
    elif congestion_score >= 20.0:
        severity = "WATCH"
        desc = "Moderate congestion risk; localized crawling traffic near inundated sections"
    else:
        severity = "NORMAL"
        desc = "Minor rainfall friction; free-flow conditions prevailing"

    return {
        "congestion_score": congestion_score,
        "severity": severity,
        "affected_roads_count": sum(1 for r in road_evaluations if r.get("capacity_reduction_factor", 0.0) > 0.15),
        "bottlenecks_count": len(bottlenecks),
        "description": desc,
        "status": "MODEL_ESTIMATED_RAINFALL_CONGESTION_RISK"
    }
