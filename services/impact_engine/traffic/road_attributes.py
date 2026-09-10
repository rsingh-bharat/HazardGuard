"""
Road attribute utilities and importance weights.
"""
from typing import Dict, Any

IMPORTANCE_WEIGHTS = {
    "CRITICAL": 1.0,
    "HIGH": 0.75,
    "MEDIUM": 0.50,
    "LOW": 0.25
}

def get_road_attributes(road: Dict[str, Any]) -> Dict[str, Any]:
    imp = road.get("importance", "MEDIUM")
    weight = IMPORTANCE_WEIGHTS.get(imp, 0.5)
    return {
        "importance_weight": weight,
        "baseline_capacity_vph": road.get("baseline_capacity_vph", 2000),
        "lanes": road.get("lanes", 2),
        "speed_limit_kmh": road.get("speed_limit_kmh", 40)
    }
