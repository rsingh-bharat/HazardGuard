"""
Urban drainage zone definitions and spatial extents.
"""
from typing import List, Dict, Any

def get_drainage_zones() -> List[Dict[str, Any]]:
    """
    Returns realistic storm drainage zones for the urban AOI
    (modeled after Koramangala, Ejipura, Bellandur, and HSR stormwater catchments).
    """
    return [
        {
            "zone_id": "DRN_Z1_KORAMANGALA",
            "name": "Koramangala 4th-Block Storm Trunk",
            "type": "box_culvert_primary",
            "catchment_area_km2": 4.8,
            "design_return_period_yrs": 5,
            "design_capacity_m3_s": 28.5,
            "outfall_destination": "Bellandur Inflow Channel",
            "centroid": [77.625, 12.934]
        },
        {
            "zone_id": "DRN_Z2_EJIPURA",
            "name": "Ejipura Secondary Drain & Intermediate Sump",
            "type": "open_masonry_channel",
            "catchment_area_km2": 3.2,
            "design_return_period_yrs": 2,
            "design_capacity_m3_s": 14.0,
            "outfall_destination": "K-C Valley Main Drain",
            "centroid": [77.632, 12.942]
        },
        {
            "zone_id": "DRN_Z3_HSR_SECTOR1",
            "name": "HSR Sector 1 Outfall Channel",
            "type": "reinforced_concrete_culvert",
            "catchment_area_km2": 5.1,
            "design_return_period_yrs": 5,
            "design_capacity_m3_s": 32.0,
            "outfall_destination": "Agara Lake Basin",
            "centroid": [77.645, 12.915]
        },
        {
            "zone_id": "DRN_Z4_BELLANDUR_MARGIN",
            "name": "Bellandur Lake Margin Overflow Corridor",
            "type": "natural_retention_weir",
            "catchment_area_km2": 6.5,
            "design_return_period_yrs": 10,
            "design_capacity_m3_s": 42.0,
            "outfall_destination": "Varthur Lake Spillway",
            "centroid": [77.675, 12.936]
        }
    ]
