"""Data normalization, unit conversions, coordinate validation, and deduplication."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from ml.config.settings import INDIA_BOUNDS, SUPPORTED_UNITS
from ml.data.schema import CanonicalForecastRecord, CanonicalObservationRecord


def normalize_rainfall_unit(value: float, unit: str) -> float:
    """Normalize various rainfall units into millimeters (mm).

    Fails explicitly on NaN, Inf, or negative rainfall values.
    """
    if value is None or not math.isfinite(value):
        raise ValueError(f"Invalid non-finite rainfall value: {value}")
    if value < 0:
        raise ValueError(f"Physical constraint violation: negative rainfall {value} {unit}")

    u = unit.strip().lower()
    if u not in SUPPORTED_UNITS:
        raise ValueError(f"Unsupported rainfall unit '{unit}'. Supported: {SUPPORTED_UNITS}")

    if u in ("in", "inch", "inches"):
        return value * 25.4
    elif u == "cm":
        return value * 10.0
    elif u == "m":
        return value * 1000.0
    elif u == "mm":
        return float(value)
    else:
        raise ValueError(f"Unhandled unit conversion for '{unit}'")


def validate_coordinates(
    lat: float,
    lon: float,
    enforce_india: bool = False,
    bounds: Optional[Dict[str, float]] = None,
) -> bool:
    """Validate geographic coordinates.

    Checks standard WGS84 range (-90..90, -180..180) and optionally India domain.
    """
    if lat is None or lon is None:
        return False
    if not math.isfinite(lat) or not math.isfinite(lon):
        return False
    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        return False

    if enforce_india:
        b = bounds or INDIA_BOUNDS
        if not (b["min_lat"] <= lat <= b["max_lat"] and b["min_lon"] <= lon <= b["max_lon"]):
            return False

    return True


def parse_iso_utc(ts: str) -> datetime:
    """Parse ISO8601 timestamp string and convert to UTC datetime."""
    if not ts or not isinstance(ts, str):
        raise ValueError(f"Invalid timestamp format: {ts}")
    # Handle 'Z' suffix
    clean_ts = ts.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(clean_ts)
    except Exception as e:
        raise ValueError(f"Cannot parse ISO8601 timestamp '{ts}': {e}") from e

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def format_grid_id(lat: float, lon: float) -> str:
    """Generate deterministic canonical grid identifier without arbitrary snapping."""
    # Preserve native coordinates to 4 decimal places to handle IEEE floating point noise
    return f"grid_{lat:.4f}_{lon:.4f}"


def deduplicate_observations(
    records: List[CanonicalObservationRecord],
) -> List[CanonicalObservationRecord]:
    """Deduplicate observation records keeping the latest ingested record per (grid_id, valid_time).

    Returns deterministically sorted list by (valid_time, latitude, longitude).
    """
    dedup_map: Dict[Tuple[str, str], CanonicalObservationRecord] = {}

    for rec in records:
        key = (rec.grid_id, rec.valid_time)
        if key not in dedup_map:
            dedup_map[key] = rec
        else:
            existing = dedup_map[key]
            t_rec = parse_iso_utc(rec.ingestion_time)
            t_ext = parse_iso_utc(existing.ingestion_time)
            if t_rec > t_ext:
                dedup_map[key] = rec

    result = list(dedup_map.values())
    result.sort(key=lambda r: (r.valid_time, r.latitude, r.longitude))
    return result


def deduplicate_forecasts(
    records: List[CanonicalForecastRecord],
) -> List[CanonicalForecastRecord]:
    """Deduplicate forecast records keeping the latest ingested record per (grid_id, init_time, valid_time, lead).

    Returns deterministically sorted list by (initialization_time, valid_time, lead_time_hours, latitude, longitude).
    """
    dedup_map: Dict[Tuple[str, str, str, float], CanonicalForecastRecord] = {}

    for rec in records:
        key = (rec.grid_id, rec.initialization_time, rec.valid_time, rec.lead_time_hours)
        if key not in dedup_map:
            dedup_map[key] = rec
        else:
            existing = dedup_map[key]
            t_rec = parse_iso_utc(rec.ingestion_time)
            t_ext = parse_iso_utc(existing.ingestion_time)
            if t_rec > t_ext:
                dedup_map[key] = rec

    result = list(dedup_map.values())
    result.sort(
        key=lambda r: (
            r.initialization_time,
            r.valid_time,
            r.lead_time_hours,
            r.latitude,
            r.longitude,
        )
    )
    return result
