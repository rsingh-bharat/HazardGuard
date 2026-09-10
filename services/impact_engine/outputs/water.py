"""
Water outputs formatting.
"""
from typing import List, Dict, Any
from .geojson import build_water_geojson

def format_water_artifacts(water_depth_grid: List[List[float]], bbox: List[float], timestamp: str, scenario: str) -> Dict[str, Any]:
    return {
        "geojson": build_water_geojson(water_depth_grid, bbox, timestamp, scenario),
        "resolution_m": 30.0,
        "interpolation": "bilinear"
    }
