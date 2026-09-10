"""
Rainfall excess and surface runoff calculation.
"""
from typing import List, Dict, Any

def calculate_runoff_excess(
    rainfall_mm: float,
    infiltration_mm: float,
    runoff_coefficient: float = 0.65
) -> float:
    """
    Computes effective surface runoff depth (mm) for the given rainfall and infiltration.
    R = max(0, (P - F)) * C
    """
    excess_p = max(0.0, rainfall_mm - infiltration_mm)
    runoff_mm = excess_p * max(0.0, min(1.0, runoff_coefficient))
    return round(runoff_mm, 2)
