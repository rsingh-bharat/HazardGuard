"""
Water depth spatial raster generation from routed runoff and topographic slope.
"""
import math
from typing import List, Dict, Any

def calculate_water_depth(
    routed_runoff_grid: List[List[float]],
    slope_grid: List[List[float]],
    depression_amplification: float = 2.4
) -> List[List[float]]:
    """
    Converts routed water volume into equivalent standing water depth in meters.
    Topographic slope factor: Flat valleys and depressions retain deeper ponding,
    while hillsides drain quickly.
    """
    rows = len(routed_runoff_grid)
    cols = len(routed_runoff_grid[0]) if rows > 0 else 0
    depth_grid: List[List[float]] = []

    for r in range(rows):
        row_depth: List[float] = []
        for c in range(cols):
            water_mm = routed_runoff_grid[r][c]
            slope_deg = slope_grid[r][c]

            # Slope damping factor: 0 deg slope retains full depth; steep slopes retain very little
            slope_retention = 1.0 / (1.0 + math.tan(math.radians(max(0.5, slope_deg))) * 4.0)
            
            # Base water depth in meters
            base_depth_m = (water_mm / 1000.0) * slope_retention * depression_amplification

            # Clamp and round
            row_depth.append(round(max(0.0, base_depth_m), 3))
        depth_grid.append(row_depth)

    return depth_grid
