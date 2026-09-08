"""
Drainage hydraulic capacity and design limits.
"""
from typing import Dict, Any

def get_zone_capacity(zone: Dict[str, Any]) -> float:
    """Returns design peak discharge capacity in m3/s."""
    return float(zone.get("design_capacity_m3_s", 20.0))
