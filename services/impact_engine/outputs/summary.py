"""
Simulation summary metrics aggregation.
"""
from typing import List, Dict, Any
from ..core.schemas import ImpactState

def build_simulation_summary(
    timeline: List[ImpactState],
    scenario_type: str,
    total_rainfall_mm: float
) -> Dict[str, Any]:
    if not timeline:
        return {}

    max_water_depth_m = max(t.water.get("max_depth_m", 0.0) for t in timeline)
    max_inundated_km2 = max(t.water.get("inundated_area_km2", 0.0) for t in timeline)
    max_congestion = max(t.congestion.get("congestion_score", 0.0) for t in timeline)
    
    # Collect all unique warnings
    all_warnings = []
    seen_warn_ids = set()
    for t in timeline:
        for w in t.warnings:
            wid = w.id if hasattr(w, "id") else w.get("id")
            if wid not in seen_warn_ids:
                seen_warn_ids.add(wid)
                all_warnings.append(w)

    crit_warnings = [w for w in all_warnings if (w.severity if hasattr(w, "severity") else w.get("severity")) == "CRITICAL"]
    high_warnings = [w for w in all_warnings if (w.severity if hasattr(w, "severity") else w.get("severity")) == "HIGH"]

    final_state = timeline[-1]
    drainage_zones_overflow = final_state.drainage.get("overflow_zones", [])
    bottlenecks = final_state.roads.get("bottlenecks", [])

    pop_data = final_state.exposure.get("population", {})
    est_pop = pop_data.get("estimated_total_population_exposure", 0)

    fac_data = final_state.exposure.get("hospitals", [])
    compromised_facs = [f for f in fac_data if f.get("access_risk_level") in ["HIGH", "CRITICAL"]]

    return {
        "scenario": scenario_type,
        "rainfall_total_mm": total_rainfall_mm,
        "peak_water_depth_m": round(max_water_depth_m, 3),
        "peak_inundated_area_km2": round(max_inundated_km2, 3),
        "max_congestion_score": round(max_congestion, 1),
        "drainage_overflow_zones_count": len(drainage_zones_overflow),
        "road_bottlenecks_count": len(bottlenecks),
        "critical_facilities_at_risk_count": len(compromised_facs),
        "estimated_population_exposed": est_pop,
        "total_warnings_count": len(all_warnings),
        "critical_warnings_count": len(crit_warnings),
        "high_warnings_count": len(high_warnings),
        "overall_status": "CRITICAL_IMPACT" if crit_warnings else ("HIGH_IMPACT" if high_warnings else "ELEVATED_WATCH")
    }
