"""
Road network graph representation for AOI.
"""
from typing import List, Dict, Any

def get_road_network() -> List[Dict[str, Any]]:
    """
    Returns primary arterial, sub-arterial, and collector road segments for the AOI.
    Coordinates correspond to real Bengaluru Urban corridors.
    """
    return [
        {
            "road_id": "RD_ORR_BELLANDUR",
            "name": "Outer Ring Road - Bellandur Flyover Corridor",
            "road_type": "PRIMARY_ARTERIAL",
            "lanes": 6,
            "importance": "CRITICAL",
            "baseline_capacity_vph": 5400,
            "speed_limit_kmh": 60,
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.660, 12.928], [77.674, 12.936], [77.685, 12.942]]
            }
        },
        {
            "road_id": "RD_KORAMANGALA_80FT",
            "name": "Koramangala 80 Feet Road (Sony World Junction)",
            "road_type": "SUB_ARTERIAL",
            "lanes": 4,
            "importance": "HIGH",
            "baseline_capacity_vph": 3200,
            "speed_limit_kmh": 40,
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.618, 12.932], [77.626, 12.935], [77.634, 12.938]]
            }
        },
        {
            "road_id": "RD_SARJAPUR_MAIN",
            "name": "Sarjapur Main Road (Iblur - Kaikondrahalli)",
            "road_type": "PRIMARY_ARTERIAL",
            "lanes": 4,
            "importance": "CRITICAL",
            "baseline_capacity_vph": 3600,
            "speed_limit_kmh": 50,
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.652, 12.918], [77.665, 12.912], [77.678, 12.908]]
            }
        },
        {
            "road_id": "RD_INTERMEDIATE_RR",
            "name": "Intermediate Ring Road (Domlur to Koramangala)",
            "road_type": "PRIMARY_ARTERIAL",
            "lanes": 6,
            "importance": "HIGH",
            "baseline_capacity_vph": 4800,
            "speed_limit_kmh": 60,
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.638, 12.956], [77.632, 12.944], [77.628, 12.936]]
            }
        },
        {
            "road_id": "RD_EJIPURA_MAIN",
            "name": "Ejipura Main Road",
            "road_type": "COLLECTOR",
            "lanes": 2,
            "importance": "MEDIUM",
            "baseline_capacity_vph": 1600,
            "speed_limit_kmh": 30,
            "geometry": {
                "type": "LineString",
                "coordinates": [[77.625, 12.945], [77.630, 12.940], [77.635, 12.937]]
            }
        }
    ]
