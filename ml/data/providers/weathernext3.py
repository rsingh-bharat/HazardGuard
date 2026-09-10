"""WeatherNext 3 Spatial Statistics Provider.

Ingests and normalizes WeatherNext 3 precomputed spatial statistics from GCS Zarr v3 datasets
into CanonicalForecastRecord instances with explicit ForecastDistribution (ENSEMBLE_STATISTICS).
"""

from __future__ import annotations

import io
import json
import logging
import math
import os
import re
import shutil
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import zstandard

from ml.config.settings import CACHE_DIR, DATASET_VERSION, INDIA_BOUNDS
from ml.data.normalizer import format_grid_id, parse_iso_utc, validate_coordinates
from ml.data.providers.base import ForecastProvider, ProviderCapabilities, ProviderConfig
from ml.data.schema import (
    CanonicalForecastRecord,
    DistributionType,
    EnsembleStats,
    ForecastDistribution,
    ProvenanceInfo,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Specific Error Classes
# ---------------------------------------------------------------------------

class WeatherNextError(Exception):
    """Base error for WeatherNext 3 provider failures."""
    pass


class WeatherNextAuthError(WeatherNextError):
    """Authentication or token resolution failure."""
    pass


class WeatherNextAccessDeniedError(WeatherNextError):
    """403 Forbidden access to WeatherNext 3 bucket or asset."""
    pass


class WeatherNextNotFoundError(WeatherNextError):
    """Run, coordinate chunk, or object not found in WeatherNext 3 store."""
    pass


class WeatherNextMalformedDatasetError(WeatherNextError):
    """Zarr metadata or data chunk is corrupted or malformed."""
    pass


class WeatherNextCoordinateNotFoundError(WeatherNextError):
    """Requested coordinate falls outside the valid coordinate space."""
    pass


class WeatherNextInvalidLeadError(WeatherNextError):
    """Requested lead time is negative or exceeds available lead horizon."""
    pass


# ---------------------------------------------------------------------------
# Provider Implementation
# ---------------------------------------------------------------------------

class WeatherNext3StatisticsProvider(ForecastProvider):
    """Provider for WeatherNext 3 precomputed spatial statistics.
    
    Reads from gs://weathernext3_statistics_spatial/ (or local offline fixture root)
    and produces CanonicalForecastRecords with genuine statistical percentiles.
    """

    DEFAULT_BUCKET = "weathernext3_statistics_spatial"
    DEFAULT_PREFIX = "weathernext_3_0_0_statistics/zarr/2026_to_present"
    GCS_STORAGE_API = "https://storage.googleapis.com/storage/v1/b"

    STAT_VARIABLES = (
        "total_precipitation_1hr_p10",
        "total_precipitation_1hr_p25",
        "total_precipitation_1hr_p50",
        "total_precipitation_1hr_p75",
        "total_precipitation_1hr_p90",
        "total_precipitation_1hr_mean",
    )

    def __init__(
        self,
        config: ProviderConfig,
        bucket_name: Optional[str] = None,
        base_prefix: Optional[str] = None,
        access_token: Optional[str] = None,
        local_fixture_root: Optional[str] = None,
        cache_dir: Optional[str] = None,
        enforce_india_bounds: bool = False,
        timeout_seconds: int = 30,
    ):
        super().__init__(config)
        self.bucket_name = bucket_name or self.DEFAULT_BUCKET
        self.base_prefix = (base_prefix or self.DEFAULT_PREFIX).strip("/")
        self._access_token = access_token
        self.local_fixture_root = local_fixture_root
        self.cache_dir = cache_dir or os.path.join(CACHE_DIR, "weathernext3_spatial_stats")
        self.enforce_india_bounds = enforce_india_bounds
        self.timeout_seconds = timeout_seconds

        os.makedirs(self.cache_dir, exist_ok=True)
        self._dctx = zstandard.ZstdDecompressor()

    # -----------------------------------------------------------------------
    # Auth Resolution
    # -----------------------------------------------------------------------

    def _get_access_token(self) -> str:
        """Resolve Google Cloud auth token using gcloud CLI or environment."""
        if self._access_token:
            return self._access_token

        # Check environment variable
        env_token = os.environ.get("GOOGLE_ACCESS_TOKEN") or os.environ.get("GCS_ACCESS_TOKEN")
        if env_token:
            return env_token

        # Try invoking gcloud CLI
        gcloud_paths = [
            "gcloud.cmd" if os.name == "nt" else "gcloud",
            "gcloud",
            r"D:\New folder\google-cloud-sdk\bin\gcloud.cmd",
            r"C:\Users\Lenovo\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        ]
        for gp in gcloud_paths:
            try:
                token = subprocess.check_output(
                    [gp, "auth", "print-access-token"],
                    stderr=subprocess.DEVNULL,
                    shell=(os.name == "nt" and gp in ("gcloud.cmd", "gcloud"))
                )
                self._access_token = token.decode("utf-8").strip()
                logger.info(f"Successfully obtained GCS token via {gp}")
                return self._access_token
            except Exception:
                continue

        raise WeatherNextAuthError(
            "Could not obtain Google Cloud access token. Please run 'gcloud auth login' "
            "or set GOOGLE_ACCESS_TOKEN environment variable."
        )

    # -----------------------------------------------------------------------
    # Spatial Coordinate Mapping
    # -----------------------------------------------------------------------

    @staticmethod
    def coordinate_to_indices(lat: float, lon: float) -> Tuple[int, int]:
        """Map (latitude, longitude) in degrees to Zarr array grid indices.
        
        Grid resolution: 0.1°
        lat_0p1: [-90.0, 90.0] -> index = int(round((lat + 90.0) * 10)) in [0, 1800]
        lon_0p1: [0.0, 360.0) -> index = int(round((lon % 360.0) * 10)) % 3600 in [0, 3599]
        """
        if not (-90.0 <= lat <= 90.0):
            raise WeatherNextCoordinateNotFoundError(f"Latitude {lat} is outside [-90, 90].")
        if not (-180.0 <= lon <= 360.0):
            raise WeatherNextCoordinateNotFoundError(f"Longitude {lon} is outside [-180, 360].")

        lat_idx = int(round((lat + 90.0) * 10))
        if not (0 <= lat_idx <= 1800):
            raise WeatherNextCoordinateNotFoundError(f"Computed lat index {lat_idx} out of range [0, 1800].")

        norm_lon = lon % 360.0
        lon_idx = int(round(norm_lon * 10)) % 3600
        return lat_idx, lon_idx

    # -----------------------------------------------------------------------
    # Data Retrieval (Local Fixture / GCS)
    # -----------------------------------------------------------------------

    def _read_object_bytes(self, relative_path: str) -> bytes:
        """Read raw bytes from local fixture root or GCS with CWD-independent disk caching."""
        # 1. Local Fixture
        if self.local_fixture_root:
            full_path = os.path.join(self.local_fixture_root, relative_path.replace("/", os.sep))
            if not os.path.exists(full_path):
                raise WeatherNextNotFoundError(f"Local fixture file not found: {full_path}")
            with open(full_path, "rb") as f:
                return f.read()

        # 2. Local Disk Cache (sanitized safe cache key)
        safe_cache_key = re.sub(r"[^a-zA-Z0-9_.-]", "_", relative_path.replace("/", "_").replace("\\", "_"))
        cache_file = os.path.join(self.cache_dir, safe_cache_key)
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.warning(f"Failed to read cache file {cache_file}: {e}")

        # 3. GCS Download
        token = self._get_access_token()
        obj_name = f"{self.base_prefix}/{relative_path}".replace("//", "/")
        quoted_name = urllib.parse.quote(obj_name, safe="")
        url = f"{self.GCS_STORAGE_API}/{self.bucket_name}/o/{quoted_name}?alt=media"

        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": "HazardGuard-WeatherNext3/1.0",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                data = resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise WeatherNextAuthError(f"Unauthorized (401) accessing GCS object {obj_name}: {e}") from e
            elif e.code == 403:
                raise WeatherNextAccessDeniedError(f"Access Denied (403) for GCS object {obj_name}: {e}") from e
            elif e.code == 404:
                raise WeatherNextNotFoundError(f"Object not found (404) in GCS: {obj_name}") from e
            else:
                raise WeatherNextError(f"HTTP error {e.code} reading GCS object {obj_name}: {e}") from e
        except Exception as e:
            raise WeatherNextError(f"Network failure reading GCS object {obj_name}: {e}") from e

        # Save to disk cache atomically
        try:
            temp_cache = cache_file + ".tmp"
            with open(temp_cache, "wb") as f:
                f.write(data)
            shutil.move(temp_cache, cache_file)
        except Exception as e:
            logger.debug(f"Failed caching {cache_file}: {e}")

        return data

    def _read_chunk_array(self, run_id: str, variable: str, lead_idx: int) -> np.ndarray:
        """Fetch and decompress a 2D spatial slice (1801, 3600) for a specific lead hour index."""
        # Chunk addressing format: {run_id}/predictions.zarr/{variable}/c/{lead_idx}/0/0
        chunk_rel_path = f"{run_id}/predictions.zarr/{variable}/c/{lead_idx}/0/0"
        try:
            raw_bytes = self._read_object_bytes(chunk_rel_path)
        except WeatherNextNotFoundError:
            # Check single-digit directory fallback: c/{lead_idx}/0/0/0
            fallback_path = f"{run_id}/predictions.zarr/{variable}/c/{lead_idx}/0/0/0"
            raw_bytes = self._read_object_bytes(fallback_path)

        try:
            decomp = self._dctx.decompress(raw_bytes)
        except Exception as e:
            raise WeatherNextMalformedDatasetError(f"Failed decompressing zstd chunk for {chunk_rel_path}: {e}") from e

        try:
            arr = np.frombuffer(decomp, dtype=np.float32)
            if len(arr) != 1801 * 3600:
                raise ValueError(f"Expected 6483600 elements, got {len(arr)}")
            return arr.reshape((1801, 3600))
        except Exception as e:
            raise WeatherNextMalformedDatasetError(f"Failed parsing float32 chunk {chunk_rel_path}: {e}") from e

    def _verify_run_exists(self, run_id: str) -> None:
        """Verify that the requested run exists in local fixtures or GCS.
        
        Raises:
            WeatherNextNotFoundError: If the run cannot be located.
        """
        if self.local_fixture_root:
            run_path = os.path.join(self.local_fixture_root, run_id)
            if not os.path.exists(run_path):
                raise WeatherNextNotFoundError(
                    f"Run '{run_id}' not found in local fixture root: {self.local_fixture_root}"
                )
            return

        # For GCS, query prefix to verify run existence
        token = self._get_access_token()
        prefix = f"{self.base_prefix}/{run_id}/".replace("//", "/")
        quoted_prefix = urllib.parse.quote(prefix, safe="")
        url = f"{self.GCS_STORAGE_API}/{self.bucket_name}/o?prefix={quoted_prefix}&maxResults=1"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": "HazardGuard-WeatherNext3/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_seconds) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                items = data.get("items", [])
                if not items:
                    raise WeatherNextNotFoundError(
                        f"Run '{run_id}' not found in GCS bucket '{self.bucket_name}' under prefix '{prefix}'."
                    )
        except WeatherNextNotFoundError:
            raise
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise WeatherNextAuthError(f"Unauthorized (401) verifying run {run_id}: {e}") from e
            elif e.code == 403:
                raise WeatherNextAccessDeniedError(f"Access Denied (403) verifying run {run_id}: {e}") from e
            elif e.code == 404:
                raise WeatherNextNotFoundError(f"Run '{run_id}' not found in GCS: {e}") from e
            else:
                raise WeatherNextError(f"HTTP error {e.code} verifying run {run_id}: {e}") from e
        except Exception as e:
            raise WeatherNextError(f"Network failure verifying run {run_id}: {e}") from e

    def _read_run_init_time(self, run_id: str) -> Tuple[str, str]:
        """Resolve initialization timestamp and its source without silent wall-clock substitution.
        
        Preferred source order:
        1. dataset metadata (predictions.zarr/.zattrs or zarr.json)
        2. verified run_id parsing (YYYYMMDD_HHhr_...)
        3. otherwise raise WeatherNextMalformedDatasetError
        
        Returns:
            Tuple[str, str]: (init_time_iso, init_time_source)
        """
        # 1. Try dataset metadata
        for meta_file in (f"{run_id}/predictions.zarr/.zattrs", f"{run_id}/predictions.zarr/zarr.json"):
            try:
                raw = self._read_object_bytes(meta_file)
                meta = json.loads(raw.decode("utf-8"))
                for key in ("init_time", "initialization_time", "run_time", "reference_time", "time"):
                    if key in meta and meta[key]:
                        init_dt = parse_iso_utc(str(meta[key]))
                        return init_dt.isoformat(), "dataset_metadata"
            except (WeatherNextNotFoundError, json.JSONDecodeError):
                continue
            except (WeatherNextAuthError, WeatherNextAccessDeniedError):
                raise
            except Exception as e:
                logger.debug(f"Metadata read check {meta_file}: {e}")

        # 2. Verified run_id parsing
        match = re.match(r"^(\d{4})(\d{2})(\d{2})_(\d{2})hr", run_id)
        if match:
            year, month, day, hour = match.groups()
            try:
                dt = datetime(int(year), int(month), int(day), int(hour), 0, 0, tzinfo=timezone.utc)
                return dt.isoformat(), "run_id_parsed"
            except ValueError as e:
                raise WeatherNextMalformedDatasetError(
                    f"Invalid date/time values in run_id '{run_id}': {e}"
                ) from e

        # 3. Explicit error (do not silently substitute wall-clock datetime.now())
        raise WeatherNextMalformedDatasetError(
            f"Could not determine initialization time for run '{run_id}'. "
            "Neither dataset metadata nor verified run_id format could be resolved."
        )

    def _classify_run_status(self, run_id: str, init_iso: str, start_date: str) -> str:
        """Classify operational status of run as HISTORICAL, LATEST_AVAILABLE, or STALE/NOT_CURRENT.
        
        Distinguishes based on requested target date and model run age without relying on a fixed 7-day rule.
        """
        try:
            init_dt = parse_iso_utc(init_iso)
            now = datetime.now(timezone.utc)
            req_start_dt = parse_iso_utc(start_date + "T00:00:00Z")

            # Historical request (caller requested past date > 48h before now)
            if (now - req_start_dt).total_seconds() > 48 * 3600:
                return "HISTORICAL"

            # Check age of the initialization time relative to current wall-clock
            age_hours = (now - init_dt).total_seconds() / 3600.0
            if age_hours > 48.0:
                return "STALE/NOT_CURRENT"

            return "LATEST_AVAILABLE"
        except Exception:
            return "HISTORICAL"

    # -----------------------------------------------------------------------
    # Core Forecast Fetch
    # -----------------------------------------------------------------------

    def fetch_forecasts(
        self,
        lats: List[float],
        lons: List[float],
        start_date: str,
        end_date: str,
        lead_time_hours: Optional[List[float]] = None,
        run_id: Optional[str] = None,
        **kwargs: Any,
    ) -> List[CanonicalForecastRecord]:
        """Fetch WeatherNext 3 forecasts and compute accumulated statistics across lead windows.
        
        Args:
            lats: Target latitudes.
            lons: Target longitudes.
            start_date: Target start date (YYYY-MM-DD).
            end_date: Target end date (YYYY-MM-DD).
            lead_time_hours: Requested forecast lead times (e.g. [24.0, 48.0, 72.0]).
            run_id: Specific model run folder (default: run matching start_date).
        """
        if len(lats) != len(lons):
            raise ValueError(f"Mismatch between latitudes count ({len(lats)}) and longitudes count ({len(lons)})")

        target_leads = lead_time_hours or [24.0]
        for lt in target_leads:
            if lt <= 0 or lt > 360:
                raise WeatherNextInvalidLeadError(f"Lead time {lt}h is invalid. Must be between 1 and 360 hours.")

        # Determine run_id
        if not run_id:
            clean_date = start_date.replace("-", "")
            run_id = f"{clean_date}_00hr_01_preds"

        # Truthful provenance: verify run actually exists before using
        self._verify_run_exists(run_id)

        init_iso, init_time_source = self._read_run_init_time(run_id)
        run_status = self._classify_run_status(run_id, init_iso, start_date)
        ingest_ts = datetime.now(timezone.utc).isoformat()
        all_records: List[CanonicalForecastRecord] = []

        for lat, lon in zip(lats, lons):
            if self.enforce_india_bounds and not validate_coordinates(lat, lon, enforce_india=True):
                logger.warning(f"Coordinate ({lat}, {lon}) outside India bounds; skipping.")
                continue

            lat_idx, lon_idx = self.coordinate_to_indices(lat, lon)
            grid_id = format_grid_id(lat, lon)

            for lt in target_leads:
                lead_int = int(round(lt))
                # Accumulation window: 1..lead_int hours inclusive (indices 0..lead_int-1)
                accum_stats: Dict[str, float] = {var: 0.0 for var in self.STAT_VARIABLES}

                for h in range(lead_int):
                    for var in self.STAT_VARIABLES:
                        arr = self._read_chunk_array(run_id, var, h)
                        # Dataset unit is meters (m); multiply by 1000.0 to convert to millimeters (mm)
                        val_mm = float(arr[lat_idx, lon_idx]) * 1000.0
                        accum_stats[var] += val_mm

                accum_mean = accum_stats["total_precipitation_1hr_mean"]

                # Scientific Integrity:
                # Marginal quantiles (p10, p25, p50, p75, p90) CANNOT be summed into cumulative percentiles.
                # Only the hourly mean sums to accumulated mean.
                # Cumulative percentiles remain strictly None with statistics_quality = "MARGINAL_QUANTILE_ONLY".
                distribution = ForecastDistribution(
                    type=DistributionType.ENSEMBLE_STATISTICS,
                    statistics_quality="MARGINAL_QUANTILE_ONLY",
                    mean_mm=accum_mean,
                    p10_mm=None,
                    p25_mm=None,
                    p50_mm=None,
                    p75_mm=None,
                    p90_mm=None,
                    accumulation_hours=float(lead_int),
                )

                # Legacy EnsembleStats for backward-compatibility with downstream schemas
                ens_stats = EnsembleStats(
                    mean=accum_mean,
                    median=accum_mean,
                    p10=0.0,
                    p25=0.0,
                    p50=0.0,
                    p75=0.0,
                    p90=0.0,
                    std=0.0,
                    min=0.0,
                    max=0.0,
                    member_count=0,  # 0 indicates precomputed summary statistics, NOT explicit members
                    perturbed_member_count=0,
                    exceedance_probabilities={},
                )

                # Compute valid time = init_time + lead_time_hours
                init_dt = parse_iso_utc(init_iso)
                valid_iso = datetime.fromtimestamp(init_dt.timestamp() + lead_int * 3600, tz=timezone.utc).isoformat()

                # Atmospheric variables at valid lead hour (index lead_int - 1)
                temp_c = None
                wind_kmh = None
                sp_hpa = None

                try:
                    t_arr = self._read_chunk_array(run_id, "temperature_2m_mean", lead_int - 1)
                    temp_k = float(t_arr[lat_idx, lon_idx])
                    temp_c = temp_k - 273.15
                except (WeatherNextAuthError, WeatherNextAccessDeniedError, WeatherNextMalformedDatasetError):
                    raise
                except WeatherNextNotFoundError as e:
                    logger.warning("Optional atmospheric variable 'temperature_2m_mean' not found for run %s lead %d: %s - %s", run_id, lead_int, type(e).__name__, e)
                except Exception as e:
                    logger.warning("Failed retrieving atmospheric variable 'temperature_2m_mean' (%s): %s", type(e).__name__, e)

                try:
                    w_arr = self._read_chunk_array(run_id, "wind_speed_10m_mean", lead_int - 1)
                    wind_ms = float(w_arr[lat_idx, lon_idx])
                    wind_kmh = wind_ms * 3.6
                except (WeatherNextAuthError, WeatherNextAccessDeniedError, WeatherNextMalformedDatasetError):
                    raise
                except WeatherNextNotFoundError as e:
                    logger.warning("Optional atmospheric variable 'wind_speed_10m_mean' not found for run %s lead %d: %s - %s", run_id, lead_int, type(e).__name__, e)
                except Exception as e:
                    logger.warning("Failed retrieving atmospheric variable 'wind_speed_10m_mean' (%s): %s", type(e).__name__, e)

                try:
                    sp_arr = self._read_chunk_array(run_id, "mean_sea_level_pressure_mean", lead_int - 1)
                    sp_pa = float(sp_arr[lat_idx, lon_idx])
                    sp_hpa = sp_pa / 100.0
                except (WeatherNextAuthError, WeatherNextAccessDeniedError, WeatherNextMalformedDatasetError):
                    raise
                except WeatherNextNotFoundError as e:
                    logger.warning("Optional atmospheric variable 'mean_sea_level_pressure_mean' not found for run %s lead %d: %s - %s", run_id, lead_int, type(e).__name__, e)
                except Exception as e:
                    logger.warning("Failed retrieving atmospheric variable 'mean_sea_level_pressure_mean' (%s): %s", type(e).__name__, e)

                prov = ProvenanceInfo(
                    source=self.config.source_name,
                    model_id=self.config.model_id,
                    run_id=run_id,
                    ingestion_timestamp=ingest_ts,
                    dataset_version=self.config.provenance_metadata.get("dataset_version", DATASET_VERSION),
                    init_time=init_iso,
                    valid_time=valid_iso,
                    run_status=run_status,
                    init_time_source=init_time_source,
                )

                rec = CanonicalForecastRecord(
                    source=self.config.source_name,
                    dataset_version=prov.dataset_version,
                    initialization_time=init_iso,
                    valid_time=valid_iso,
                    lead_time_hours=float(lead_int),
                    ingestion_time=ingest_ts,
                    latitude=lat,
                    longitude=lon,
                    grid_id=grid_id,
                    forecast_rainfall_mm=accum_mean,  # Canonical central estimate is accumulated mean
                    ensemble_stats=ens_stats,
                    distribution=distribution,
                    surface_pressure_hpa=sp_hpa,
                    wind_speed_kmh=wind_kmh,
                    temperature_celsius=temp_c,
                    provenance=prov,
                )
                all_records.append(rec)

        return all_records
