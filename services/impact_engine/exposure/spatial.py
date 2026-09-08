"""
Spatial coordinate translation and raster sampling.
"""
from typing import List, Tuple

def sample_raster_at_point(
    lon: float,
    lat: float,
    raster: List[List[float]],
    bbox: List[float]
) -> float:
    if not raster:
        return 0.0
    rows = len(raster)
    cols = len(raster[0]) if rows > 0 else 0
    min_lon, min_lat, max_lon, max_lat = bbox

    c_norm = (lon - min_lon) / max(0.0001, (max_lon - min_lon))
    r_norm = 1.0 - ((lat - min_lat) / max(0.0001, (max_lat - min_lat)))

    r = max(0, min(rows - 1, int(r_norm * rows)))
    c = max(0, min(cols - 1, int(c_norm * cols)))

    return raster[r][c]
