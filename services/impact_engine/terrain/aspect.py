"""
Aspect calculation from elevation grid.
"""
import math
from typing import List

def calculate_aspect(elevation: List[List[float]], cell_size_m: float = 30.0) -> List[List[float]]:
    rows = len(elevation)
    cols = len(elevation[0]) if rows > 0 else 0
    aspect_grid: List[List[float]] = []

    for r in range(rows):
        aspect_row: List[float] = []
        for c in range(cols):
            r_prev = max(0, r - 1)
            r_next = min(rows - 1, r + 1)
            c_prev = max(0, c - 1)
            c_next = min(cols - 1, c + 1)

            dz_dx = (elevation[r][c_next] - elevation[r][c_prev]) / (2.0 * cell_size_m)
            dz_dy = (elevation[r_next][c] - elevation[r_prev][c]) / (2.0 * cell_size_m)

            if dz_dx == 0 and dz_dy == 0:
                aspect_deg = -1.0  # Flat
            else:
                aspect_rad = math.atan2(dz_dy, -dz_dx)
                aspect_deg = math.degrees(aspect_rad)
                if aspect_deg < 0:
                    aspect_deg += 360.0
            aspect_row.append(round(aspect_deg, 1))
        aspect_grid.append(aspect_row)

    return aspect_grid
