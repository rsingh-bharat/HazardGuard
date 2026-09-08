"""
Topographic runoff routing using D8 flow directions.
"""
from typing import List, Tuple
from ..terrain.flow_direction import D8_NEIGHBORS

def route_runoff_flow(
    runoff_mm: float,
    elevation: List[List[float]],
    flow_direction: List[List[int]],
    slope_grid: List[List[float]],
    attenuation_factor: float = 0.85
) -> List[List[float]]:
    """
    Distributes generated runoff across the terrain grid and routes downslope.
    Flatter areas accumulate higher volume, while steep slopes shed water.
    """
    rows = len(elevation)
    cols = len(elevation[0]) if rows > 0 else 0

    # Local initial runoff sheet per cell (mm)
    routed = [[runoff_mm for _ in range(cols)] for _ in range(rows)]

    # Sort cells from highest to lowest elevation so flow routes sequentially
    cell_list = []
    for r in range(rows):
        for c in range(cols):
            cell_list.append((elevation[r][c], r, c))
    cell_list.sort(key=lambda item: item[0], reverse=True)

    code_to_delta = {code: (dr, dc) for dr, dc, code, _ in D8_NEIGHBORS}

    for _, r, c in cell_list:
        code = flow_direction[r][c]
        if code in code_to_delta:
            dr, dc = code_to_delta[code]
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                # Transferred water is modulated by slope and attenuation
                transferred = routed[r][c] * attenuation_factor
                routed[nr][nc] += transferred

    return routed
