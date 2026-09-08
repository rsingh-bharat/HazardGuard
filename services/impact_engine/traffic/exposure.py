"""
Road alignment spatial intersection with water depth raster field.
"""
from typing import List, Dict, Any

def calculate_road_water_exposure(
    road: Dict[str, Any],
    water_depth_grid: List[List[float]],
    bbox: List[float]
) -> Dict[str, Any]:
    """
    Interpolates water depth along the road geometry line coordinates.
    Returns max water depth, mean water depth, and inundated length fraction.
    """
    coords = road.get("geometry", {}).get("coordinates", [])
    if not coords or not water_depth_grid:
        return {"max_depth_m": 0.0, "mean_depth_m": 0.0, "inundated_fraction": 0.0}

    rows = len(water_depth_grid)
    cols = len(water_depth_grid[0]) if rows > 0 else 0
    min_lon, min_lat, max_lon, max_lat = bbox

    sampled_depths: List[float] = []

    for lon, lat in coords:
        c_norm = (lon - min_lon) / max(0.0001, (max_lon - min_lon))
        r_norm = 1.0 - ((lat - min_lat) / max(0.0001, (max_lat - min_lat)))

        r = max(0, min(rows - 1, int(r_norm * rows)))
        c = max(0, min(cols - 1, int(c_norm * cols)))

        # Also sample 3x3 surrounding cells to account for road buffer zone
        local_max = 0.0
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                nr = max(0, min(rows - 1, r + dr))
                nc = max(0, min(cols - 1, c + dc))
                if water_depth_grid[nr][nc] > local_max:
                    local_max = water_depth_grid[nr][nc]

        sampled_depths.append(local_max)

    max_d = max(sampled_depths) if sampled_depths else 0.0
    mean_d = sum(sampled_depths) / len(sampled_depths) if sampled_depths else 0.0
    inundated_points = sum(1 for d in sampled_depths if d >= 0.10)
    fraction = inundated_points / len(sampled_depths) if sampled_depths else 0.0

    return {
        "max_depth_m": round(max_d, 3),
        "mean_depth_m": round(mean_d, 3),
        "inundated_fraction": round(fraction, 2)
    }
