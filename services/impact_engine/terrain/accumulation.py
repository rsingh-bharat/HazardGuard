"""
Flow accumulation algorithm based on topographic sorting and D8 flow direction.
"""
from typing import List, Tuple
from .flow_direction import D8_NEIGHBORS

def calculate_flow_accumulation(elevation: List[List[float]], flow_direction: List[List[int]]) -> List[List[float]]:
    rows = len(elevation)
    cols = len(elevation[0]) if rows > 0 else 0
    
    # Initialize accumulation grid (each cell contributes at least 1.0 unit of upstream area)
    accum = [[1.0 for _ in range(cols)] for _ in range(rows)]
    
    # Order cells by elevation descending (highest cells route water first)
    cell_list = []
    for r in range(rows):
        for c in range(cols):
            cell_list.append((elevation[r][c], r, c))
    cell_list.sort(key=lambda item: item[0], reverse=True)
    
    # Map code to (dr, dc)
    code_to_delta = {code: (dr, dc) for dr, dc, code, _ in D8_NEIGHBORS}
    
    for _, r, c in cell_list:
        code = flow_direction[r][c]
        if code in code_to_delta:
            dr, dc = code_to_delta[code]
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                # Add current accumulation downstream
                accum[nr][nc] += accum[r][c]
                
    return accum
