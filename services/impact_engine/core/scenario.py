"""
Scenario resolver for LOW, BASE, HIGH, and CUSTOM rainfall events (with backward-compatible P10/P50/P90 aliases).
"""
from .schemas import ImpactRequest, Scenario, ForecastSnapshot

def resolve_scenario(req: ImpactRequest) -> Scenario:
    scen_type = req.scenario_type.upper()
    rf = req.forecast.rainfall
    
    if scen_type in ("LOW", "P10"):
        rainfall_mm = rf.low_scenario_mm
    elif scen_type in ("BASE", "P50"):
        rainfall_mm = rf.base_scenario_mm
    elif scen_type in ("HIGH", "P90"):
        rainfall_mm = rf.high_scenario_mm
    elif scen_type == "CUSTOM":
        rainfall_mm = float(req.custom_rainfall_mm if req.custom_rainfall_mm is not None else 0.0)
    else:
        raise ValueError(f"Unsupported scenario type: {scen_type}. Must be LOW, BASE, HIGH, or CUSTOM.")
        
    return Scenario(
        type=scen_type,
        rainfall_mm=rainfall_mm,
        duration_hours=req.duration_hours,
        timestep_hours=req.timestep_hours
    )
