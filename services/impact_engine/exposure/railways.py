"""
Railway track alignment exposure.
"""
from typing import List, Dict, Any

def get_railway_infrastructure() -> List[Dict[str, Any]]:
    return [
        {
            "railway_id": "RL_BYPL_BELLANDUR_LINE",
            "name": "Baiyappanahalli - Bellandur - Carmelaram Sub-Urban Rail",
            "type": "BROAD_GAUGE_SUBURBAN",
            "criticality": "HIGH",
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.658, 12.960], [77.670, 12.940], [77.685, 12.915]]
            }
        }
    ]

def evaluate_railway_exposure(
    railways: List[Dict[str, Any]],
    water_depth_grid: List[List[float]],
    bbox: List[float]
) -> List[Dict[str, Any]]:
    from .spatial import sample_raster_at_point
    results = []
    for r in railways:
        coords = r.get("geometry", {}).get("coordinates", [])
        depths = [sample_raster_at_point(pt[0], pt[1], water_depth_grid, bbox) for pt in coords]
        max_d = max(depths) if depths else 0.0
        results.append({
            "railway_id": r["railway_id"],
            "name": r["name"],
            "max_ballast_depth_m": round(max_d, 3),
            "severity": "CRITICAL" if max_d >= 0.20 else ("HIGH" if max_d >= 0.10 else "NORMAL"),
            "status": "TRACK_SUBMERGED_CAUTION_ORDER" if max_d >= 0.15 else "CLEAR"
        })
    return results
