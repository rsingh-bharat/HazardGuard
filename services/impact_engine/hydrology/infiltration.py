"""
Infiltration loss modeling using simplified Horton capacity decay.
"""
import math
from typing import Dict, Any

def calculate_infiltration_loss(
    rainfall_increment_mm: float,
    elapsed_hours: float,
    timestep_hours: float = 3.0,
    f0_mm_hr: float = 25.0,
    fc_mm_hr: float = 4.5,
    k_decay: float = 0.8
) -> float:
    """
    Computes cumulative infiltration abstraction over the timestep using Horton equation:
    f(t) = fc + (f0 - fc) * exp(-k * t)
    Infiltration depth = integral over dt, capped by available rainfall.
    """
    if rainfall_increment_mm <= 0.0:
        return 0.0

    t_start = max(0.0, elapsed_hours - timestep_hours)
    t_end = elapsed_hours

    # Integrated Horton capacity over [t_start, t_end] in mm
    # Integral = fc * (t_end - t_start) + ((f0 - fc) / k) * (exp(-k * t_start) - exp(-k * t_end))
    int_fc = fc_mm_hr * (t_end - t_start)
    int_transient = ((f0_mm_hr - fc_mm_hr) / max(0.01, k_decay)) * (
        math.exp(-k_decay * t_start) - math.exp(-k_decay * t_end)
    )
    potential_infil_mm = max(0.0, int_fc + int_transient)

    # Actual infiltration cannot exceed available rainfall
    actual_infil_mm = min(rainfall_increment_mm, potential_infil_mm)
    return round(actual_infil_mm, 2)
