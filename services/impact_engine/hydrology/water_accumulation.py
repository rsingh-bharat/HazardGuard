"""
Water accumulation volume and surface area tracking.
"""
from typing import List, Dict, Any

def calculate_water_accumulation(
    routed_runoff_grid: List[List[float]],
    cell_size_m: float = 30.0
) -> Dict[str, Any]:
    rows = len(routed_runoff_grid)
    cols = len(routed_runoff_grid[0]) if rows > 0 else 0
    cell_area_m2 = cell_size_m * cell_size_m

    total_volume_m3 = 0.0
    ponding_cells = 0

    for r in range(rows):
        for c in range(cols):
            depth_mm = routed_runoff_grid[r][c]
            if depth_mm > 5.0:  # Threshold for perceptible ponding (>5mm)
                ponding_cells += 1
                volume_m3 = (depth_mm / 1000.0) * cell_area_m2
                total_volume_m3 += volume_m3

    total_area_km2 = (rows * cols * cell_area_m2) / 1_000_000.0
    inundated_area_km2 = (ponding_cells * cell_area_m2) / 1_000_000.0

    return {
        "total_volume_m3": round(total_volume_m3, 1),
        "inundated_area_km2": round(inundated_area_km2, 3),
        "total_area_km2": round(total_area_km2, 3),
        "inundation_fraction": round(inundated_area_km2 / max(0.001, total_area_km2), 4)
    }
