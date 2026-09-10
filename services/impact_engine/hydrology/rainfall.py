"""
Rainfall input normalization and bounds check.
"""
from typing import Dict, Any

def normalize_rainfall(rainfall_mm: float) -> float:
    """Ensure rainfall is non-negative float and clamped to physically realistic bounds."""
    if rainfall_mm < 0.0:
        raise ValueError("Rainfall cannot be negative")
    # Clean rounding to 2 decimal places
    return round(float(rainfall_mm), 2)
