"""
D8 deterministic steepest descent flow direction model.
Standard D8 codes:
  32   64  128   (NW  N  NE)
  16    0    1   (W  Sink E)
   8    4    2   (SW  S  SE)
"""
import math
from typing import List, Tuple

# Offsets: (dr, dc, d8_code, distance_factor)
D8_NEIGHBORS = [
    (0, 1, 1, 1.0),            # E
    (1, 1, 2, math.sqrt(2)),   # SE
    (1, 0, 4, 1.0),            # S
    (1, -1, 8, math.sqrt(2)),  # SW
    (0, -1, 16, 1.0),          # W
    (-1, -1, 32, math.sqrt(2)),# NW
    (-1, 0, 64, 1.0),          # N
    (-1, 1, 128, math.sqrt(2)) # NE
]

def calculate_d8_flow_direction(elevation: List[List[float]], cell_size_m: float = 30.0) -> List[List[int]]:
    rows = len(elevation)
    cols = len(elevation[0]) if rows > 0 else 0
    flow_grid: List[List[int]] = []

    for r in range(rows):
        flow_row: List[int] = []
        for c in range(cols):
            z_curr = elevation[r][c]
            max_drop = 0.0
            steepest_code = 0

            for dr, dc, code, dist_mult in D8_NEIGHBORS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols:
                    z_neighbor = elevation[nr][nc]
                    dist = cell_size_m * dist_mult
                    drop_rate = (z_curr - z_neighbor) / dist
                    if drop_rate > max_drop:
                        max_drop = drop_rate
                        steepest_code = code

            flow_row.append(steepest_code)
        flow_grid.append(flow_row)

    return flow_grid
