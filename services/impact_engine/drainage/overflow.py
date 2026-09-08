"""
Potential drainage and storm sewer overflow risk detection.
"""
from typing import List, Dict, Any

def identify_overflow_risk(
    zones: List[Dict[str, Any]],
    utilizations: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Identifies zones with potential drainage/sewer overflow risk.
    Honest framing: labeled as 'scenario-based estimated overflow risk'.
    """
    overflow_zones: List[Dict[str, Any]] = []

    for zone in zones:
        zid = zone["zone_id"]
        ratio = utilizations.get(zid, 0.0)
        if ratio >= 0.70:
            severity = "CRITICAL" if ratio >= 1.05 else ("HIGH" if ratio >= 0.90 else "WATCH")
            overflow_zones.append({
                "zone_id": zid,
                "name": zone["name"],
                "utilization_ratio": ratio,
                "severity": severity,
                "risk_label": "POTENTIAL_OVERFLOW_RISK" if ratio >= 1.05 else "ELEVATED_SURCHARGE_RISK",
                "estimated_excess_discharge_m3_s": round(max(0.0, (ratio - 1.0) * float(zone.get("design_capacity_m3_s", 20.0))), 2),
                "centroid": zone.get("centroid", [0.0, 0.0]),
                "status": "SCENARIO_BASED_ESTIMATE"
            })

    return overflow_zones
