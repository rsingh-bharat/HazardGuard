"""
Road vehicular capacity reduction factor based on flood depth.
"""
from typing import Dict, Any

def calculate_capacity_reduction(water_depth_m: float) -> Dict[str, Any]:
    """
    Computes capacity reduction factor (0.0 to 1.0) and status description.
    Based on empirical vehicle exhaust intake clearances and speed reduction curves.
    """
    if water_depth_m >= 0.40:
        return {
            "capacity_reduction_factor": 0.95,
            "effective_capacity_ratio": 0.05,
            "speed_reduction_pct": 95.0,
            "status": "TOTAL_CLOSURE_IMPASSABLE",
            "severity": "CRITICAL"
        }
    elif water_depth_m >= 0.25:
        # Interpolate between 50% and 85% reduction
        ratio = 0.50 + ((water_depth_m - 0.25) / 0.15) * 0.35
        return {
            "capacity_reduction_factor": round(ratio, 2),
            "effective_capacity_ratio": round(1.0 - ratio, 2),
            "speed_reduction_pct": round(ratio * 100.0, 1),
            "status": "PARTIAL_DISRUPTION_HIGH_CLEARANCE_ONLY",
            "severity": "HIGH"
        }
    elif water_depth_m >= 0.10:
        # Interpolate between 15% and 35% reduction
        ratio = 0.15 + ((water_depth_m - 0.10) / 0.15) * 0.20
        return {
            "capacity_reduction_factor": round(ratio, 2),
            "effective_capacity_ratio": round(1.0 - ratio, 2),
            "speed_reduction_pct": round(ratio * 100.0, 1),
            "status": "SPEED_REDUCTION_STANDING_WATER",
            "severity": "WATCH"
        }
    else:
        return {
            "capacity_reduction_factor": 0.0,
            "effective_capacity_ratio": 1.0,
            "speed_reduction_pct": 0.0,
            "status": "NORMAL_FREE_FLOW",
            "severity": "NORMAL"
        }
