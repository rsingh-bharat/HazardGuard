"""
Deterministic cache key generation for simulation runs.
"""
import hashlib
import json
from typing import Dict, Any
from .schemas import ImpactRequest

def generate_cache_key(req: ImpactRequest, versions: Dict[str, str]) -> str:
    rf = req.forecast.rainfall
    key_dict = {
        "forecast_id": req.forecast.forecast_id,
        "district_id": req.forecast.district_id,
        "scenario": req.scenario_type,
        "custom_rainfall_mm": req.custom_rainfall_mm if req.scenario_type == "CUSTOM" else None,
        "p10": rf.p10_mm,
        "p50": rf.p50_mm,
        "p90": rf.p90_mm,
        "duration_hours": req.duration_hours,
        "timestep_hours": req.timestep_hours,
        "resolution_m": req.resolution_m,
        "bbox": req.bbox or req.forecast.bbox,
        "terrain_version": versions.get("terrain_version", "v1"),
        "impact_model_version": versions.get("impact_model_version", "v1"),
        "threshold_version": versions.get("threshold_version", "v1"),
        "infrastructure_data_version": versions.get("infrastructure_data_version", "v1"),
        "auth_snapshot_id": (req.authoritative_forecast or {}).get("snapshot_id"),
        "auth_fallback": (req.authoritative_forecast or {}).get("fallback"),
        "auth_verification_status": (req.authoritative_forecast or {}).get("verification_status"),
        "auth_probability": (req.authoritative_forecast or {}).get("probability")
    }
    raw = json.dumps(key_dict, sort_keys=True)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"sim_{req.forecast.district_id}_{req.scenario_type.lower()}_{digest[:16]}"
