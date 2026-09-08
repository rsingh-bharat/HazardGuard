"""
Building footprint exposure evaluation.
Uses scientific terminology: 'building exposure' (never claims structural failure).
"""
from typing import List, Dict, Any
from .spatial import sample_raster_at_point

def get_buildings() -> List[Dict[str, Any]]:
    return [
        {
            "building_id": "BLD_ECOSPACE_TECH",
            "name": "RMZ Ecospace Tech Campus (ORR Bellandur)",
            "use": "COMMERCIAL_TECH_PARK",
            "floors": 10,
            "footprint_area_m2": 24000,
            "coordinates": [77.678, 12.933]
        },
        {
            "building_id": "BLD_RAHEJA_RESIDENCY",
            "name": "Raheja Residency Towers (Koramangala 3rd Block)",
            "use": "RESIDENTIAL_APARTMENTS",
            "floors": 8,
            "footprint_area_m2": 15000,
            "coordinates": [77.627, 12.932]
        },
        {
            "building_id": "BLD_EJIPURA_URBAN_POCKET",
            "name": "Ejipura Low-Lying Residential Enclave",
            "use": "HIGH_DENSITY_RESIDENTIAL",
            "floors": 3,
            "footprint_area_m2": 32000,
            "coordinates": [77.631, 12.943]
        },
        {
            "building_id": "BLD_HSR_SECTOR1_COMMERCIAL",
            "name": "HSR Sector 1 Commercial Strip",
            "use": "MIXED_USE_RETAIL",
            "floors": 4,
            "footprint_area_m2": 18000,
            "coordinates": [77.648, 12.916]
        }
    ]

def evaluate_building_exposure(
    buildings: List[Dict[str, Any]],
    water_depth_grid: List[List[float]],
    bbox: List[float]
) -> Dict[str, Any]:
    exposed_buildings: List[Dict[str, Any]] = []

    for b in buildings:
        lon, lat = b["coordinates"]
        depth = sample_raster_at_point(lon, lat, water_depth_grid, bbox)
        if depth >= 0.08:
            sev = "CRITICAL" if depth >= 0.35 else ("HIGH" if depth >= 0.20 else "WATCH")
            exposed_buildings.append({
                "building_id": b["building_id"],
                "name": b["name"],
                "use": b["use"],
                "estimated_ground_water_depth_m": round(depth, 3),
                "severity": sev,
                "exposure_category": "BASEMENT_AND_GROUND_INUNDATION" if depth >= 0.20 else "PERIMETER_WATER_LOGGING",
                "coordinates": b["coordinates"],
                "status": "MODEL_ESTIMATE_BUILDING_EXPOSURE"
            })

    return {
        "total_evaluated": len(buildings),
        "exposed_count": len(exposed_buildings),
        "high_exposure_count": sum(1 for eb in exposed_buildings if eb["severity"] in ["HIGH", "CRITICAL"]),
        "buildings": exposed_buildings
    }
