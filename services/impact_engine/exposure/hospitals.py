"""
Hospital exposure and feeder access disruption modeling.
Direct compound depth vs access route cutoff.
"""
from typing import List, Dict, Any
from .spatial import sample_raster_at_point

def get_hospitals() -> List[Dict[str, Any]]:
    return [
        {
            "facility_id": "HOSP_MANIPAL",
            "name": "Manipal Hospital (HAL Old Airport Rd)",
            "type": "TERTIARY_TRAUMA_CENTER",
            "capacity_beds": 650,
            "coordinates": [77.651, 12.958],
            "access_road_id": "RD_INTERMEDIATE_RR",
            "criticality": "EXTREME"
        },
        {
            "facility_id": "HOSP_SAKRA_WORLD",
            "name": "Sakra World Hospital (Bellandur)",
            "type": "MULTISPECIALTY_HOSPITAL",
            "capacity_beds": 350,
            "coordinates": [77.682, 12.927],
            "access_road_id": "RD_ORR_BELLANDUR",
            "criticality": "EXTREME"
        },
        {
            "facility_id": "HOSP_ST_JOHNS",
            "name": "St. John's Medical College Hospital",
            "type": "ACADEMIC_MEDICAL_CENTER",
            "capacity_beds": 1200,
            "coordinates": [77.619, 12.930],
            "access_road_id": "RD_KORAMANGALA_80FT",
            "criticality": "EXTREME"
        }
    ]

def evaluate_hospital_access(
    hospitals: List[Dict[str, Any]],
    water_depth_grid: List[List[float]],
    road_evaluations: List[Dict[str, Any]],
    bbox: List[float]
) -> List[Dict[str, Any]]:
    road_depth_map = {r["road_id"]: r.get("water_depth_m", 0.0) for r in road_evaluations}
    results = []

    for h in hospitals:
        lon, lat = h["coordinates"]
        direct_depth = sample_raster_at_point(lon, lat, water_depth_grid, bbox)
        access_road_id = h.get("access_road_id", "")
        access_depth = road_depth_map.get(access_road_id, 0.0)

        # Access risk is elevated if access road is submerged, even if compound is dry
        if direct_depth >= 0.25 or access_depth >= 0.35:
            severity = "CRITICAL"
            status = "ACCESS_CUT_OFF_OR_DIRECT_FLOOD"
        elif direct_depth >= 0.10 or access_depth >= 0.20:
            severity = "HIGH"
            status = "ACCESS_SEVERELY_RESTRICTED"
        elif direct_depth >= 0.05 or access_depth >= 0.10:
            severity = "WATCH"
            status = "MINOR_ACCESS_IMPEDANCE"
        else:
            severity = "NORMAL"
            status = "FULLY_ACCESSIBLE"

        results.append({
            "facility_id": h["facility_id"],
            "name": h["name"],
            "type": h["type"],
            "direct_water_depth_m": round(direct_depth, 3),
            "access_road_id": access_road_id,
            "access_route_max_depth_m": round(access_depth, 3),
            "access_risk_level": severity,
            "status": status,
            "coordinates": h["coordinates"],
            "criticality": h["criticality"]
        })

    return results
