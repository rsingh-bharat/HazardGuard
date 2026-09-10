"""
Slope raster derivation from elevation matrix using finite difference.
"""
import math
from typing import List

def calculate_slope(elevation: List[List[float]], cell_size_m: float = 30.0) -> List[List[float]]:
    rows = len(elevation)
    cols = len(elevation[0]) if rows > 0 else 0
    slope_grid: List[List[float]] = []

    for r in range(rows):
        slope_row: List[float] = []
        for c in range(cols):
            # Neighbor lookups with clamping
            r_prev = max(0, r - 1)
            r_next = min(rows - 1, r + 1)
            c_prev = max(0, c - 1)
            c_next = min(cols - 1, c + 1)

            # Central difference
            dz_dx = (elevation[r][c_next] - elevation[r][c_prev]) / (2.0 * cell_size_m)
            dz_dy = (elevation[r_next][c] - elevation[r_prev][c]) / (2.0 * cell_size_m)

            # Gradient magnitude
            grad = math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy)
            # Slope in degrees
            deg = math.degrees(math.atan(grad))
            slope_row.append(round(deg, 2))
        slope_grid.append(slope_row)

    return slope_grid
