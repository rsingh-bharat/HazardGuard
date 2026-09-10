"""
Exposure output formatting.
"""
from typing import Dict, Any

def format_exposure_summary(exposure_dict: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "hospitals_at_risk": len([h for h in exposure_dict.get("hospitals", []) if h.get("access_risk_level") in ["HIGH", "CRITICAL"]]),
        "schools_at_risk": len([s for s in exposure_dict.get("schools", []) if s.get("severity") in ["HIGH", "CRITICAL"]]),
        "power_stations_at_risk": len([p for p in exposure_dict.get("power", []) if p.get("severity") in ["HIGH", "CRITICAL"]]),
        "buildings_exposed": exposure_dict.get("buildings", {}).get("exposed_count", 0),
        "population_exposed_est": exposure_dict.get("population", {}).get("estimated_total_population_exposure", 0)
    }
