"""
Electrical grid substations and critical energy infrastructure.
"""
from typing import List, Dict, Any
from .spatial import sample_raster_at_point

def get_power_substations() -> List[Dict[str, Any]]:
    return [
        {
            "substation_id": "PWR_KORAMANGALA_66KV",
            "name": "Koramangala 66/11kV Receiving Station (BESCOM)",
            "voltage_kv": 66,
            "coordinates": [77.628, 12.929],
            "criticality": "EXTREME"
        },
        {
            "substation_id": "PWR_BELLANDUR_220KV",
            "name": "Bellandur 220/66kV Major Grid Substation",
            "voltage_kv": 220,
            "coordinates": [77.671, 12.939],
            "criticality": "EXTREME"
        }
    ]

def evaluate_power_exposure(
    substations: List[Dict[str, Any]],
    water_depth_grid: List[List[float]],
    bbox: List[float]
) -> List[Dict[str, Any]]:
    results = []
    for p in substations:
        lon, lat = p["coordinates"]
        d = sample_raster_at_point(lon, lat, water_depth_grid, bbox)
        results.append({
            "substation_id": p["substation_id"],
            "name": p["name"],
            "plinth_water_depth_m": round(d, 3),
            "severity": "CRITICAL" if d >= 0.20 else ("HIGH" if d >= 0.10 else "NORMAL"),
            "grid_tripping_risk": "HIGH" if d >= 0.15 else ("MODERATE" if d >= 0.08 else "LOW"),
            "coordinates": p["coordinates"]
        })
    return results
