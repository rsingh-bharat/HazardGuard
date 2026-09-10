"""
Elevation statistical summaries and spatial lookups.
"""
from typing import List, Dict, Tuple

def get_elevation_stats(elevation: List[List[float]]) -> Dict[str, float]:
    all_vals = [val for row in elevation for val in row]
    if not all_vals:
        return {"min": 0.0, "max": 0.0, "mean": 0.0}
    return {
        "min": min(all_vals),
        "max": max(all_vals),
        "mean": round(sum(all_vals) / len(all_vals), 2)
    }

def get_point_elevation(elevation: List[List[float]], r_norm: float, c_norm: float) -> float:
    rows = len(elevation)
    cols = len(elevation[0]) if rows > 0 else 0
    r = max(0, min(rows - 1, int(r_norm * rows)))
    c = max(0, min(cols - 1, int(c_norm * cols)))
    return elevation[r][c]
