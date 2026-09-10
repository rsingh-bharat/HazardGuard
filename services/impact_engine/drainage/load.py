"""
Drainage hydraulic load calculation using Rational method or volumetric runoff.
"""
from typing import Dict, Any

def calculate_drainage_load(
    zone: Dict[str, Any],
    rainfall_intensity_mm_hr: float,
    runoff_coefficient: float = 0.70
) -> float:
    """
    Computes estimated runoff discharge inflow Q (m3/s) into drainage zone.
    Rational Formula: Q = (C * I * A) / 3.6
    where A is area in km2, I is intensity in mm/hr, C is runoff coefficient.
    """
    area_km2 = float(zone.get("catchment_area_km2", 3.0))
    q_m3_s = (runoff_coefficient * rainfall_intensity_mm_hr * area_km2) / 3.6
    return round(max(0.0, q_m3_s), 2)
