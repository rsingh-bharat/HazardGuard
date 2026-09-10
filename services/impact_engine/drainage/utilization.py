"""
Hydraulic capacity utilization ratio calculation.
"""
from typing import Dict, Any

def calculate_utilization(load_m3_s: float, capacity_m3_s: float) -> float:
    if capacity_m3_s <= 0.0:
        return 2.0
    return round(load_m3_s / capacity_m3_s, 3)
