"""
Educational institutes and shelter point exposure.
"""
from typing import List, Dict, Any
from .spatial import sample_raster_at_point

def get_schools() -> List[Dict[str, Any]]:
    return [
        {
            "school_id": "SCH_NATIONAL_PUBLIC",
            "name": "National Public School (HSR Layout)",
            "type": "PRIMARY_SECONDARY_SCHOOL",
            "coordinates": [77.639, 12.912],
            "evacuation_shelter_capacity": 450
        },
        {
            "school_id": "SCH_BETHANY_HIGH",
            "name": "Bethany High School (Koramangala)",
            "type": "SECONDARY_SCHOOL",
            "coordinates": [77.621, 12.937],
            "evacuation_shelter_capacity": 600
        }
    ]

def evaluate_school_exposure(
    schools: List[Dict[str, Any]],
    water_depth_grid: List[List[float]],
    bbox: List[float]
) -> List[Dict[str, Any]]:
    results = []
    for s in schools:
        lon, lat = s["coordinates"]
        d = sample_raster_at_point(lon, lat, water_depth_grid, bbox)
        results.append({
            "school_id": s["school_id"],
            "name": s["name"],
            "water_depth_m": round(d, 3),
            "severity": "CRITICAL" if d >= 0.30 else ("HIGH" if d >= 0.15 else "NORMAL"),
            "shelter_viability": "COMPROMISED" if d >= 0.15 else "OPERATIONAL",
            "coordinates": s["coordinates"]
        })
    return results
