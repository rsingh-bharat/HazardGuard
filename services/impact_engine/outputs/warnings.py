"""
Warnings output formatting.
"""
from typing import List, Dict, Any
from .geojson import build_warnings_geojson

def format_warnings_artifacts(warnings: List[Any], timestamp: str, scenario: str) -> Dict[str, Any]:
    return {
        "geojson": build_warnings_geojson(warnings, timestamp, scenario),
        "total_count": len(warnings)
    }
