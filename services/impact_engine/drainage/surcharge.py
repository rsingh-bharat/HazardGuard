"""
Drainage surcharge and backwater stress evaluation.
"""
from typing import Dict, Any

def evaluate_surcharge(utilization_ratio: float) -> Dict[str, Any]:
    """
    Evaluates hydraulic surcharge condition.
    - Ratio < 0.70: Gravity open-channel flow (NORMAL)
    - 0.70 <= Ratio < 0.90: Full pipe flow / incipient surcharge (WATCH)
    - 0.90 <= Ratio < 1.05: Pressurized surcharge / manhole backpressure (HIGH)
    - Ratio >= 1.05: Severe hydraulic overload / surface blowout (CRITICAL)
    """
    if utilization_ratio >= 1.05:
        return {
            "status": "SEVERE_SURCHARGE",
            "severity": "CRITICAL",
            "backpressure_risk": "VERY_HIGH",
            "description": "Model-estimated hydraulic pressure exceeding pipe crown; surface backwater imminent"
        }
    elif utilization_ratio >= 0.90:
        return {
            "status": "MODERATE_SURCHARGE",
            "severity": "HIGH",
            "backpressure_risk": "HIGH",
            "description": "Pipe flowing under pressure head; low velocity outfalls experiencing backflow"
        }
    elif utilization_ratio >= 0.70:
        return {
            "status": "ELEVATED_FLOW",
            "severity": "WATCH",
            "backpressure_risk": "MODERATE",
            "description": "Capacity approaching upper design limits; localized street gully pooling"
        }
    else:
        return {
            "status": "FREE_SURFACE",
            "severity": "NORMAL",
            "backpressure_risk": "LOW",
            "description": "Gravity flow within normal design thresholds"
        }
