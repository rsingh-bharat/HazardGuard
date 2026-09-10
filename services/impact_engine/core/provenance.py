"""
Provenance tracking metadata for simulations.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from .schemas import Provenance

def create_provenance(
    forecast_id: str,
    simulation_id: str,
    scenario_type: str,
    versions: Dict[str, str],
    cache_hit: bool = False,
    authoritative_snapshot_id: str = None,
    authoritative_model_id: str = None,
    authoritative_fallback: Optional[bool] = None,
    authoritative_provider: Optional[str] = None,
    authoritative_rainfall_mm: Optional[float] = None,
    authoritative_valid_time: Optional[str] = None,
    authoritative_init_time: Optional[str] = None,
    authoritative_model_status: Optional[str] = None,
    authoritative_verification_status: Optional[str] = None,
    authoritative_probability: Optional[float] = None,
    authoritative_probability_available: Optional[bool] = None,
    authoritative_calibration_status: Optional[str] = None,
) -> Provenance:
    now_iso = datetime.now(timezone.utc).isoformat()
    return Provenance(
        forecast_id=forecast_id,
        simulation_id=simulation_id,
        scenario=scenario_type,
        terrain_version=versions.get("terrain_version", "v1.4-SRTM30-CORRECTED"),
        impact_model_version=versions.get("impact_model_version", "v2.1.0-SOUMY"),
        threshold_version=versions.get("threshold_version", "v1.2.0-STANDARD"),
        infrastructure_data_version=versions.get("infrastructure_data_version", "v2026.08-OSM-LOCAL"),
        timestamp=now_iso,
        cache_hit=cache_hit,
        authoritative_snapshot_id=authoritative_snapshot_id,
        authoritative_model_id=authoritative_model_id,
        authoritative_fallback=authoritative_fallback,
        authoritative_provider=authoritative_provider,
        authoritative_rainfall_mm=authoritative_rainfall_mm,
        authoritative_valid_time=authoritative_valid_time,
        authoritative_init_time=authoritative_init_time,
        authoritative_model_status=authoritative_model_status,
        authoritative_verification_status=authoritative_verification_status,
        authoritative_probability=authoritative_probability,
        authoritative_probability_available=authoritative_probability_available,
        authoritative_calibration_status=authoritative_calibration_status,
    )
