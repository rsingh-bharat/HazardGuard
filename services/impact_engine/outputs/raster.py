"""
Raster and matrix serialisation utilities.
"""
from typing import List, Dict, Any

def serialize_raster_metadata(
    raster: List[List[float]],
    bbox: List[float],
    name: str,
    unit: str
) -> Dict[str, Any]:
    rows = len(raster)
    cols = len(raster[0]) if rows > 0 else 0
    all_vals = [v for row in raster for v in row]
    return {
        "name": name,
        "rows": rows,
        "cols": cols,
        "unit": unit,
        "bbox": bbox,
        "min": min(all_vals) if all_vals else 0.0,
        "max": max(all_vals) if all_vals else 0.0,
        "mean": sum(all_vals) / len(all_vals) if all_vals else 0.0
    }
