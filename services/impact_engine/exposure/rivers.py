"""
Natural streams, raja-kaluve corridors, and lake water bodies.
"""
from typing import List, Dict, Any

def get_river_network() -> List[Dict[str, Any]]:
    return [
        {
            "channel_id": "CH_KC_VALLEY",
            "name": "K-C Valley Primary Storm Channel (Raja Kaluve)",
            "type": "MAJOR_DRAINAGE_CHANNEL",
            "coordinates": [[77.620, 12.950], [77.640, 12.940], [77.670, 12.934]]
        },
        {
            "channel_id": "LK_BELLANDUR",
            "name": "Bellandur Lake Water Body",
            "type": "WETLAND_RETENTION_LAKE",
            "coordinates": [[77.665, 12.935], [77.685, 12.940], [77.680, 12.925]]
        }
    ]

def evaluate_river_exposure(channels: List[Dict[str, Any]], water_depth_grid: List[List[float]], bbox: List[float]) -> List[Dict[str, Any]]:
    from .spatial import sample_raster_at_point
    results = []
    for c in channels:
        coords = c.get("coordinates", [])
        depths = [sample_raster_at_point(pt[0], pt[1], water_depth_grid, bbox) for pt in coords]
        max_d = max(depths) if depths else 0.0
        results.append({
            "channel_id": c["channel_id"],
            "name": c["name"],
            "max_water_elevation_delta_m": round(max_d, 2),
            "spillover_risk": "CRITICAL" if max_d > 0.45 else ("HIGH" if max_d > 0.25 else "NORMAL")
        })
    return results
