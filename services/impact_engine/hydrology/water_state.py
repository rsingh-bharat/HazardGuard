"""
Timestep water state structure and statistical metrics.
"""
from typing import List, Dict, Any

def create_water_state(
    timestamp: str,
    hours: int,
    rainfall_accum_mm: float,
    rainfall_increment_mm: float,
    runoff_mm: float,
    water_depth_grid: List[List[float]],
    accumulation_summary: Dict[str, Any]
) -> Dict[str, Any]:
    all_depths = [d for row in water_depth_grid for d in row]
    max_depth_m = max(all_depths) if all_depths else 0.0
    mean_depth_m = (sum(all_depths) / len(all_depths)) if all_depths else 0.0
    deep_water_cells = sum(1 for d in all_depths if d >= 0.25)

    return {
        "timestamp": timestamp,
        "hours": hours,
        "rainfall_accum_mm": rainfall_accum_mm,
        "rainfall_increment_mm": rainfall_increment_mm,
        "runoff_depth_mm": runoff_mm,
        "max_depth_m": round(max_depth_m, 3),
        "mean_depth_m": round(mean_depth_m, 3),
        "inundated_area_km2": accumulation_summary.get("inundated_area_km2", 0.0),
        "total_volume_m3": accumulation_summary.get("total_volume_m3", 0.0),
        "deep_water_cells_count": deep_water_cells,
        "depth_grid_sample": [
            [water_depth_grid[r][c] for c in range(0, len(water_depth_grid[0]), max(1, len(water_depth_grid[0]) // 10))]
            for r in range(0, len(water_depth_grid), max(1, len(water_depth_grid) // 10))
        ] if water_depth_grid else []
    }
