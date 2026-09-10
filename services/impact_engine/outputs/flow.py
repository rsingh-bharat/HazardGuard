"""
D8 flow vectors represented as directional line segments for 3D visualization.
"""
from typing import List, Dict, Any
from ..terrain.flow_direction import D8_NEIGHBORS

def build_flow_vectors_geojson(
    flow_direction_grid: List[List[int]],
    bbox: List[float],
    sample_step: int = 4
) -> Dict[str, Any]:
    min_lon, min_lat, max_lon, max_lat = bbox
    rows = len(flow_direction_grid)
    cols = len(flow_direction_grid[0]) if rows > 0 else 0

    d_lon = (max_lon - min_lon) / max(1, cols)
    d_lat = (max_lat - min_lat) / max(1, rows)

    code_to_delta = {code: (dr, dc) for dr, dc, code, _ in D8_NEIGHBORS}
    features = []

    for r in range(1, rows - 1, sample_step):
        for c in range(1, cols - 1, sample_step):
            code = flow_direction_grid[r][c]
            if code in code_to_delta:
                dr, dc = code_to_delta[code]
                lon1 = min_lon + (c + 0.5) * d_lon
                lat1 = max_lat - (r + 0.5) * d_lat

                lon2 = min_lon + (c + dc * 0.7 + 0.5) * d_lon
                lat2 = max_lat - (r + dr * 0.7 + 0.5) * d_lat

                features.append({
                    "type": "Feature",
                    "id": f"flow_{r}_{c}",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[round(lon1, 5), round(lat1, 5)], [round(lon2, 5), round(lat2, 5)]]
                    },
                    "properties": {
                        "d8_code": code,
                        "slope_vector": [dc, -dr]
                    }
                })

    return {
        "type": "FeatureCollection",
        "metadata": {"layer": "flow_vectors", "count": len(features)},
        "features": features
    }
