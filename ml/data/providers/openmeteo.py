"""Open-Meteo ECMWF IFS & GEFS provider implementations."""

from __future__ import annotations

import hashlib
import json
import logging
import math
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pathlib import Path

import requests

from ml.data.normalizer import format_grid_id, parse_iso_utc, validate_coordinates
from ml.data.schema import CanonicalForecastRecord, ProvenanceInfo
from ml.data.weathernext_ingest import compute_ensemble_stats
from ml.data.providers.base import ForecastProvider, ProviderConfig

logger = logging.getLogger(__name__)

from ml.config.settings import CACHE_DIR


class OpenMeteoEnsembleProvider(ForecastProvider):
    """Fetches ensemble data from Open-Meteo and normalizes to Canonical schema."""

    BASE_URL = "https://ensemble-api.open-meteo.com/v1/ensemble"

    def __init__(
        self,
        config: ProviderConfig,
        cache_dir: Optional[str] = None,
        request_batch_size: int = 10,  # Max points per API request to avoid 414 URI Too Long
        max_retries: int = 3,
        timeout_seconds: int = 15,
        enforce_india_bounds: bool = True,
    ):
        super().__init__(config)
        self.cache_dir = cache_dir if cache_dir is not None else CACHE_DIR
        self.request_batch_size = request_batch_size
        self.max_retries = max_retries
        self.timeout_seconds = timeout_seconds
        self.enforce_india_bounds = enforce_india_bounds

        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir, exist_ok=True)

    def _fetch_with_retry_and_cache(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch from API with disk caching, retry, and timeout."""
        # Create deterministic hash of request params for caching
        sorted_params = tuple(sorted((k, str(v)) for k, v in params.items()))
        req_hash = hashlib.md5(str(sorted_params).encode("utf-8")).hexdigest()
        cache_file = os.path.join(self.cache_dir, f"{self.config.provider_id}_{req_hash}.json")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to read cache {cache_file}: {e}")

        for attempt in range(self.max_retries):
            try:
                resp = requests.get(self.BASE_URL, params=params, timeout=self.timeout_seconds)
                if resp.status_code == 200:
                    data = resp.json()
                    # Open-Meteo returns a list if multiple coordinates, or a dict if single
                    if isinstance(data, dict):
                        data = [data]
                    
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(data, f)
                    return data
                elif resp.status_code == 429:
                    logger.warning(f"Rate limited. Retrying {attempt+1}/{self.max_retries}...")
                    time.sleep(2 ** attempt)
                else:
                    logger.error(f"Open-Meteo API error {resp.status_code}: {resp.text}")
                    break
            except requests.RequestException as e:
                logger.warning(f"Request failed: {e}. Retrying {attempt+1}/{self.max_retries}...")
                time.sleep(2 ** attempt)

        raise RuntimeError(f"Failed to fetch data from Open-Meteo after {self.max_retries} retries.")

    def fetch_forecasts(
        self,
        lats: List[float],
        lons: List[float],
        start_date: str,
        end_date: str,
        lead_time_hours: Optional[List[float]] = None,
        **kwargs
    ) -> List[CanonicalForecastRecord]:
        if len(lats) != len(lons):
            raise ValueError("Lengths of lats and lons must match.")

        all_records: List[CanonicalForecastRecord] = []
        
        # Filter bounds deterministically
        valid_coords = []
        for lat, lon in zip(lats, lons):
            if validate_coordinates(lat, lon, enforce_india=self.enforce_india_bounds):
                valid_coords.append((lat, lon))
        
        # Sort coords for deterministic request batching
        valid_coords.sort(key=lambda x: (x[0], x[1]))

        # Batch requests
        for i in range(0, len(valid_coords), self.request_batch_size):
            batch = valid_coords[i : i + self.request_batch_size]
            batch_lats = [c[0] for c in batch]
            batch_lons = [c[1] for c in batch]
            
            params = {
                "latitude": ",".join(map(str, batch_lats)),
                "longitude": ",".join(map(str, batch_lons)),
                "models": self.config.model_id,
                "hourly": "precipitation,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover",
                "start_date": start_date,
                "end_date": end_date,
                "timezone": "UTC"
            }

            responses = self._fetch_with_retry_and_cache(params)
            
            for resp in responses:
                if "hourly" not in resp or "time" not in resp["hourly"]:
                    continue
                
                resp_lat = float(resp["latitude"])
                resp_lon = float(resp["longitude"])
                grid_id = format_grid_id(resp_lat, resp_lon)
                ingest_ts = datetime.now(timezone.utc).isoformat()
                
                times = resp["hourly"]["time"]
                
                # Identify member keys dynamically
                hourly_keys = resp["hourly"].keys()
                member_keys = [k for k in hourly_keys if "precipitation_member" in k]
                # If there's a control/deterministic precipitation, some ensembles include it.
                # If we need the full count, we collect members + control. 
                # For ECMWF ifs025, precipitation_member01-50 are available + precipitation
                
                for t_idx, time_str in enumerate(times):
                    valid_time_dt = parse_iso_utc(time_str + "Z" if not time_str.endswith("Z") else time_str)
                    
                    # Open-Meteo does not expose authoritative model initialization/run metadata.
                    # We explicitly mark initialization_time as None to avoid fabricating it.
                    init_dt = None
                    
                    # For filtering purposes, if lead_time_hours is provided, we approximate
                    # an offset from start_date at 00:00Z, but we do not store this as authoritative lead time.
                    approx_init_dt = parse_iso_utc(start_date + "T00:00:00Z")
                    approx_lead_hours = (valid_time_dt - approx_init_dt).total_seconds() / 3600.0
                    
                    if approx_lead_hours < 0:
                        continue # Past data
                        
                    # Fix Issue 4: Use explicit tolerance instead of float equality
                    import math
                    if lead_time_hours is not None:
                        if not any(math.isclose(approx_lead_hours, lt, abs_tol=0.1) for lt in lead_time_hours):
                            continue
                        
                    # Extract ensemble members for this time step (Fix Issue 2 & 3)
                    perturbed_members = []
                    control_val = None
                    
                    # Deterministic / control
                    if "precipitation" in resp["hourly"]:
                        c_val = resp["hourly"]["precipitation"][t_idx]
                        if c_val is not None:
                            control_val = float(c_val)
                            
                    for m_key in member_keys:
                        val = resp["hourly"][m_key][t_idx]
                        if val is not None:
                            perturbed_members.append(float(val))
                            
                    if not perturbed_members and control_val is None:
                        continue

                    # Strict ensemble validation
                    expected_perturbed = self.expected_members - 1  # 1 is control
                    stats = compute_ensemble_stats(
                        perturbed_members, 
                        expected_member_count=expected_perturbed,
                        control_value=control_val
                    )
                    
                    # Atmospheric variables from control run if present
                    temp_val = resp["hourly"].get("temperature_2m", [None] * len(times))[t_idx] if "temperature_2m" in resp["hourly"] else None
                    rh_val = resp["hourly"].get("relative_humidity_2m", [None] * len(times))[t_idx] if "relative_humidity_2m" in resp["hourly"] else None
                    sp_val = resp["hourly"].get("surface_pressure", [None] * len(times))[t_idx] if "surface_pressure" in resp["hourly"] else None
                    ws_val = resp["hourly"].get("wind_speed_10m", [None] * len(times))[t_idx] if "wind_speed_10m" in resp["hourly"] else None
                    wd_val = resp["hourly"].get("wind_direction_10m", [None] * len(times))[t_idx] if "wind_direction_10m" in resp["hourly"] else None
                    cc_val = resp["hourly"].get("cloud_cover", [None] * len(times))[t_idx] if "cloud_cover" in resp["hourly"] else None

                    prov = ProvenanceInfo(
                        source=self.config.source_name,
                        model_id=self.config.model_id,
                        run_id=f"openmeteo_{start_date}",
                        ingestion_timestamp=ingest_ts,
                        dataset_version=self.config.provenance_metadata.get("dataset_version", "1.0"),
                    )

                    rec = CanonicalForecastRecord(
                        source=self.config.source_name,
                        dataset_version=prov.dataset_version,
                        initialization_time=None,  # Explicitly marked as unknown
                        valid_time=valid_time_dt.isoformat(),
                        lead_time_hours=None,  # Explicitly marked as unknown
                        ingestion_time=ingest_ts,
                        latitude=resp_lat,
                        longitude=resp_lon,
                        grid_id=grid_id,
                        forecast_rainfall_mm=control_val if control_val is not None else stats.mean,
                        ensemble_stats=stats,
                        surface_pressure_hpa=float(sp_val) if sp_val is not None else None,
                        wind_speed_kmh=float(ws_val) if ws_val is not None else None,
                        wind_direction_deg=float(wd_val) if wd_val is not None else None,
                        temperature_celsius=float(temp_val) if temp_val is not None else None,
                        relative_humidity_percent=float(rh_val) if rh_val is not None else None,
                        cloud_cover_percent=float(cc_val) if cc_val is not None else None,
                        provenance=prov,
                    )
                    all_records.append(rec)

        return all_records
