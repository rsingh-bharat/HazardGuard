"""WeatherNext 2 ensemble and deterministic numerical weather prediction ingestion pipelines."""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

import numpy as np

from ml.config.settings import DATASET_VERSION, DEFAULT_EXPECTED_ENSEMBLE_MEMBERS, IMD_THRESHOLDS
from ml.data.normalizer import format_grid_id, normalize_rainfall_unit, parse_iso_utc, validate_coordinates
from ml.data.schema import CanonicalForecastRecord, EnsembleStats, ProvenanceInfo


def compute_ensemble_stats(
    members: List[float], 
    expected_member_count: int = DEFAULT_EXPECTED_ENSEMBLE_MEMBERS,
    control_value: Optional[float] = None
) -> EnsembleStats:
    """Compute rigorous statistical moments for WeatherNext 2 64-member ensembles."""
    if not members:
        raise ValueError("Cannot compute ensemble stats on empty member list.")

    valid_members = []
    for m in members:
        if not math.isfinite(m):
            raise ValueError(f"Ensemble member contains non-finite value: {m}")
        if m < 0:
            raise ValueError(f"Ensemble member contains negative rainfall: {m}")
        valid_members.append(m)

    arr = np.array(valid_members, dtype=float)
    count = len(arr)

    missing_members = []
    if count < expected_member_count:
        for i in range(count + 1, expected_member_count + 1):
            missing_members.append(f"member_{i:02d}")

    exceedances = {}
    for threshold_name, threshold_mm in IMD_THRESHOLDS.items():
        prob = float(np.mean(arr >= threshold_mm))
        safe_name = threshold_name.lower()
        safe_name_mm = str(threshold_mm).replace(".", "_")
        exceedances[f"p_ge_{safe_name_mm}mm"] = prob

    return EnsembleStats(
        mean=float(np.mean(arr)),
        median=float(np.median(arr)),
        p10=float(np.percentile(arr, 10)),
        p25=float(np.percentile(arr, 25)),
        p50=float(np.percentile(arr, 50)),
        p75=float(np.percentile(arr, 75)),
        p90=float(np.percentile(arr, 90)),
        std=float(np.std(arr, ddof=1) if count > 1 else 0.0),
        min=float(np.min(arr)),
        max=float(np.max(arr)),
        member_count=count + (1 if control_value is not None else 0),
        perturbed_member_count=count,
        control_value=control_value,
        missing_members=missing_members,
        exceedance_probabilities=exceedances,
    )


class WeatherNextIngestor:
    """Ingests WeatherNext 2 forecasts and converts them to canonical representation."""

    def __init__(
        self,
        source_name: str = "WeatherNext2",
        model_id: str = "wn2_core",
        dataset_version: str = DATASET_VERSION,
        expected_members: int = DEFAULT_EXPECTED_ENSEMBLE_MEMBERS,
        enforce_india_bounds: bool = False,
    ):
        self.source_name = source_name
        self.model_id = model_id
        self.dataset_version = dataset_version
        self.expected_members = expected_members
        self.enforce_india_bounds = enforce_india_bounds

    def ingest_grid_time_series(
        self,
        grid_data: Dict[str, List[Union[float, None]]],
        start_date: str,
        end_date: str,
        lead_time_hours: float = 24.0,
        unit: str = "mm",
        run_id: str = "operational_daily",
        ingestion_time: Optional[str] = None,
        synoptic_data: Optional[Dict[str, Dict[str, List[float]]]] = None,
    ) -> List[CanonicalForecastRecord]:
        """Ingest grid-mapped daily forecast sequences."""
        ingest_ts = ingestion_time or datetime.now(timezone.utc).isoformat()
        start_dt = parse_iso_utc(f"{start_date}T00:00:00Z")
        end_dt = parse_iso_utc(f"{end_date}T00:00:00Z")
        total_days = (end_dt - start_dt).days + 1

        records: List[CanonicalForecastRecord] = []

        for coord_key, series in sorted(grid_data.items()):
            parts = coord_key.split("_")
            if len(parts) != 2:
                raise ValueError(f"Malformed grid key '{coord_key}', expected 'lat_lon'")
            lat = float(parts[0])
            lon = float(parts[1])

            if not validate_coordinates(lat, lon, enforce_india=self.enforce_india_bounds):
                continue

            if len(series) != total_days:
                raise ValueError(
                    f"Series length {len(series)} for grid {coord_key} does not match expected day count {total_days}"
                )

            grid_id = format_grid_id(lat, lon)

            for day_idx, raw_val in enumerate(series):
                if raw_val is None:
                    continue  # Missing forecast day

                valid_dt = start_dt + timedelta(days=day_idx)
                init_dt = valid_dt - timedelta(hours=lead_time_hours)

                rain_mm = normalize_rainfall_unit(float(raw_val), unit)

                pressure, wind_spd, wind_dir, temp_c, rh = None, None, None, None, None

                if synoptic_data and coord_key in synoptic_data:
                    grid_syn = synoptic_data[coord_key]
                    if "surface_pressure_hpa" in grid_syn:
                        pressure = float(grid_syn["surface_pressure_hpa"][day_idx])
                    if "wind_speed_kmh" in grid_syn:
                        wind_spd = float(grid_syn["wind_speed_kmh"][day_idx])
                    if "wind_direction_deg" in grid_syn:
                        wind_dir = float(grid_syn["wind_direction_deg"][day_idx])
                    if "temperature_celsius" in grid_syn:
                        temp_c = float(grid_syn["temperature_celsius"][day_idx])
                    if "relative_humidity_percent" in grid_syn:
                        rh = float(grid_syn["relative_humidity_percent"][day_idx])

                provenance = ProvenanceInfo(
                    source=self.source_name,
                    model_id=self.model_id,
                    run_id=run_id,
                    ingestion_timestamp=ingest_ts,
                    dataset_version=self.dataset_version,
                )

                rec = CanonicalForecastRecord(
                    source=self.source_name,
                    dataset_version=self.dataset_version,
                    initialization_time=init_dt.isoformat(),
                    valid_time=valid_dt.isoformat(),
                    lead_time_hours=lead_time_hours,
                    ingestion_time=ingest_ts,
                    latitude=lat,
                    longitude=lon,
                    grid_id=grid_id,
                    forecast_rainfall_mm=rain_mm,
                    ensemble_stats=None,
                    surface_pressure_hpa=pressure,
                    wind_speed_kmh=wind_spd,
                    wind_direction_deg=wind_dir,
                    temperature_celsius=temp_c,
                    relative_humidity_percent=rh,
                    provenance=provenance,
                )
                records.append(rec)

        records.sort(
            key=lambda r: (
                r.initialization_time,
                r.valid_time,
                r.lead_time_hours,
                r.latitude,
                r.longitude,
            )
        )
        return records

    def ingest_ensemble_records(
        self,
        raw_records: List[Dict[str, Any]],
        unit: str = "mm",
        run_id: str = "ensemble_run",
        ingestion_time: Optional[str] = None,
    ) -> List[CanonicalForecastRecord]:
        """Ingest explicit multi-member ensemble records with full probability distribution."""
        ingest_ts = ingestion_time or datetime.now(timezone.utc).isoformat()
        records: List[CanonicalForecastRecord] = []

        for item in raw_records:
            lat = float(item["latitude"])
            lon = float(item["longitude"])

            if not validate_coordinates(lat, lon, enforce_india=self.enforce_india_bounds):
                continue

            init_time = item["initialization_time"]
            valid_time = item["valid_time"]
            lead_hours = float(item.get("lead_time_hours", 24.0))

            grid_id = format_grid_id(lat, lon)

            raw_members = item.get("ensemble_members", [])
            if raw_members:
                normalized_members = [
                    normalize_rainfall_unit(float(m), unit) for m in raw_members
                ]
                stats = compute_ensemble_stats(
                    normalized_members,
                    expected_member_count=self.expected_members,
                )
                forecast_rain_mm = stats.mean
            else:
                forecast_rain_mm = normalize_rainfall_unit(
                    float(item["forecast_rainfall"]), unit
                )
                stats = None

            provenance = ProvenanceInfo(
                source=self.source_name,
                model_id=self.model_id,
                run_id=run_id,
                ingestion_timestamp=ingest_ts,
                dataset_version=self.dataset_version,
            )

            p_hpa = float(item["surface_pressure_hpa"]) if "surface_pressure_hpa" in item else None
            w_kmh = float(item["wind_speed_kmh"]) if "wind_speed_kmh" in item else None
            w_deg = float(item["wind_direction_deg"]) if "wind_direction_deg" in item else None
            t_c = float(item["temperature_celsius"]) if "temperature_celsius" in item else None
            rh = float(item["relative_humidity_percent"]) if "relative_humidity_percent" in item else None

            rec = CanonicalForecastRecord(
                source=self.source_name,
                dataset_version=self.dataset_version,
                initialization_time=init_time,
                valid_time=valid_time,
                lead_time_hours=lead_hours,
                ingestion_time=ingest_ts,
                latitude=lat,
                longitude=lon,
                grid_id=grid_id,
                forecast_rainfall_mm=forecast_rain_mm,
                ensemble_stats=stats,
                surface_pressure_hpa=p_hpa,
                wind_speed_kmh=w_kmh,
                wind_direction_deg=w_deg,
                temperature_celsius=t_c,
                relative_humidity_percent=rh,
                provenance=provenance,
            )
            records.append(rec)

        records.sort(
            key=lambda r: (
                r.initialization_time,
                r.valid_time,
                r.lead_time_hours,
                r.latitude,
                r.longitude,
            )
        )
        return records
