"""
GeoJSON FeatureCollection builders complying with HazardGuard spatial contracts.
"""
from typing import List, Dict, Any

def build_water_geojson(
    water_depth_grid: List[List[float]],
    bbox: List[float],
    timestamp: str,
    scenario: str
) -> Dict[str, Any]:
    min_lon, min_lat, max_lon, max_lat = bbox
    rows = len(water_depth_grid)
    cols = len(water_depth_grid[0]) if rows > 0 else 0

    d_lon = (max_lon - min_lon) / max(1, cols)
    d_lat = (max_lat - min_lat) / max(1, rows)

    features = []
    # Sample meaningful flood cells (> 0.08m)
    for r in range(0, rows, 2):
        for c in range(0, cols, 2):
            depth = water_depth_grid[r][c]
            if depth >= 0.08:
                lon = min_lon + (c + 0.5) * d_lon
                lat = max_lat - (r + 0.5) * d_lat
                sev = "CRITICAL" if depth >= 0.35 else ("HIGH" if depth >= 0.20 else "WATCH")
                
                features.append({
                    "type": "Feature",
                    "id": f"water_{r}_{c}_{timestamp}",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [round(lon, 5), round(lat, 5)]
                    },
                    "properties": {
                        "id": f"water_{r}_{c}",
                        "type": "WATER_ACCUMULATION",
                        "severity": sev,
                        "timestamp": timestamp,
                        "scenario": scenario,
                        "water_depth_m": round(depth, 3),
                        "status": "MODEL_ESTIMATE"
                    }
                })

    return {
        "type": "FeatureCollection",
        "metadata": {
            "layer": "water_accumulation",
            "timestamp": timestamp,
            "scenario": scenario,
            "feature_count": len(features)
        },
        "features": features
    }

def build_roads_geojson(
    road_evaluations: List[Dict[str, Any]],
    timestamp: str,
    scenario: str
) -> Dict[str, Any]:
    features = []
    for r in road_evaluations:
        depth = r.get("water_depth_m", 0.0)
        sev = r.get("severity", "NORMAL")
        reduction = r.get("capacity_reduction_factor", 0.0)

        features.append({
            "type": "Feature",
            "id": f"road_{r['road_id']}_{timestamp}",
            "geometry": r.get("geometry", {}),
            "properties": {
                "id": r["road_id"],
                "name": r["name"],
                "type": "ROAD_SEGMENT",
                "road_type": r.get("road_type", "ARTERIAL"),
                "severity": sev,
                "timestamp": timestamp,
                "scenario": scenario,
                "water_depth_m": round(depth, 3),
                "capacity_reduction_pct": round(reduction * 100, 1),
                "effective_capacity_ratio": r.get("effective_capacity_ratio", 1.0),
                "importance": r.get("importance", "MEDIUM"),
                "status": r.get("status", "NORMAL")
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {"layer": "roads", "timestamp": timestamp, "scenario": scenario},
        "features": features
    }

def build_drainage_geojson(
    drainage_zones: List[Dict[str, Any]],
    utilizations: Dict[str, float],
    timestamp: str,
    scenario: str
) -> Dict[str, Any]:
    features = []
    for z in drainage_zones:
        zid = z["zone_id"]
        ratio = utilizations.get(zid, 0.0)
        sev = "CRITICAL" if ratio >= 1.05 else ("HIGH" if ratio >= 0.90 else ("WATCH" if ratio >= 0.70 else "NORMAL"))

        features.append({
            "type": "Feature",
            "id": f"drn_{zid}_{timestamp}",
            "geometry": {
                "type": "Point",
                "coordinates": z.get("centroid", [0, 0])
            },
            "properties": {
                "id": zid,
                "name": z["name"],
                "type": "DRAINAGE_OUTFALL_ZONE",
                "severity": sev,
                "timestamp": timestamp,
                "scenario": scenario,
                "utilization_ratio": round(ratio, 3),
                "design_capacity_m3_s": z.get("design_capacity_m3_s", 20.0),
                "status": "SCENARIO_BASED_ESTIMATE"
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {"layer": "drainage", "timestamp": timestamp, "scenario": scenario},
        "features": features
    }

def build_facilities_geojson(
    facilities: List[Dict[str, Any]],
    timestamp: str,
    scenario: str
) -> Dict[str, Any]:
    features = []
    for f in facilities:
        sev = f.get("access_risk_level", f.get("severity", "NORMAL"))
        features.append({
            "type": "Feature",
            "id": f"fac_{f.get('facility_id', 'f')}_{timestamp}",
            "geometry": {
                "type": "Point",
                "coordinates": f.get("coordinates", [0, 0])
            },
            "properties": {
                "id": f.get("facility_id", ""),
                "name": f.get("name", ""),
                "type": f.get("type", "CRITICAL_FACILITY"),
                "severity": sev,
                "timestamp": timestamp,
                "scenario": scenario,
                "direct_depth_m": f.get("direct_water_depth_m", 0.0),
                "access_route_depth_m": f.get("access_route_max_depth_m", 0.0),
                "status": f.get("status", "OPERATIONAL")
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {"layer": "critical_facilities", "timestamp": timestamp, "scenario": scenario},
        "features": features
    }

def build_warnings_geojson(
    warnings: List[Any],
    timestamp: str,
    scenario: str
) -> Dict[str, Any]:
    features = []
    for w in warnings:
        w_dict = w.to_dict() if hasattr(w, "to_dict") else w
        loc = w_dict.get("location", {})
        coords = loc.get("coordinates") or loc.get("centroid") or [77.63, 12.93]

        features.append({
            "type": "Feature",
            "id": w_dict.get("id"),
            "geometry": {
                "type": "Point",
                "coordinates": coords
            },
            "properties": {
                "id": w_dict.get("id"),
                "type": w_dict.get("type"),
                "severity": w_dict.get("severity"),
                "title": w_dict.get("title"),
                "message": w_dict.get("message"),
                "timestamp": timestamp,
                "scenario": scenario,
                "trigger": w_dict.get("trigger"),
                "status": w_dict.get("status", "MODEL_ESTIMATE")
            }
        })

    return {
        "type": "FeatureCollection",
        "metadata": {"layer": "impact_warnings", "timestamp": timestamp, "scenario": scenario},
        "features": features
    }
