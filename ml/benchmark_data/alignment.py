import math
from typing import List, Dict, Tuple, Optional, Any
from datetime import datetime, timezone, timedelta
from ml.benchmark_data.schema import BenchmarkObservation
from ml.data.normalizer import format_grid_id


def _to_utc_dt(dt_val: Any) -> Optional[datetime]:
    """Robustly parse date/time value to timezone-aware UTC datetime."""
    if dt_val is None:
        return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val.astimezone(timezone.utc)
    s = str(dt_val).strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    if len(s) == 10 and s.count("-") == 2:
        s = f"{s}T00:00:00+00:00"
    try:
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt
    except Exception:
        return None


def _canonical_iso(dt: datetime) -> str:
    """Returns canonical ISO-8601 UTC string."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class SpatialNormalizer:
    """
    Normalizes 0.1 degree WeatherNext3 grid to 0.25 degree target grid using conservative remapping.
    Conservative remapping is mathematically appropriate for accumulated precipitation as it preserves
    water mass (volume) across grid cell boundaries, unlike bilinear or nearest-neighbor interpolation.
    Strictly requires 100% target cell coverage within numerical floating-point tolerance.
    """
    TARGET_CELL_AREA = 0.0625  # 0.25 * 0.25 square degrees
    TOLERANCE = 1e-6

    @staticmethod
    def conservative_remap_01_to_025(
        wn3_records: List[BenchmarkObservation],
        target_lats: List[float],
        target_lons: List[float]
    ) -> List[BenchmarkObservation]:
        # Build index of WN3 records by rounded coordinates, valid time, and lead time
        wn3_idx = {}
        for r in wn3_records:
            key = (round(r.latitude, 4), round(r.longitude, 4), r.valid_time, r.lead_time_hours)
            wn3_idx[key] = r

        remapped = []
        vt_lt_pairs = set((r.valid_time, r.lead_time_hours) for r in wn3_records)

        if len(target_lats) == len(target_lons) and any(target_lats.count(x) > 1 for x in target_lats):
            target_pairs = list(dict.fromkeys(zip(target_lats, target_lons)))
        else:
            target_pairs = [(lat, lon) for lat in set(target_lats) for lon in set(target_lons)]

        for vt, lt in vt_lt_pairs:
            for t_lat, t_lon in target_pairs:
                # Bounding box of 0.25 cell is [t_lat - 0.125, t_lat + 0.125], [t_lon - 0.125, t_lon + 0.125]
                # Source 0.1x0.1 cells have center s_lat and extent [s_lat - 0.05, s_lat + 0.05]
                # A source cell overlaps target cell iff:
                # s_lat + 0.05 > t_lat - 0.125 and s_lat - 0.05 < t_lat + 0.125
                # s_lat > t_lat - 0.175 and s_lat < t_lat + 0.175
                min_lat_idx = int(math.ceil(round((t_lat - 0.175) * 10, 6)))
                max_lat_idx = int(math.floor(round((t_lat + 0.175) * 10, 6)))
                min_lon_idx = int(math.ceil(round((t_lon - 0.175) * 10, 6)))
                max_lon_idx = int(math.floor(round((t_lon + 0.175) * 10, 6)))

                val_sum = 0.0
                weight_sum = 0.0
                base_r = None

                for lat_i in range(min_lat_idx, max_lat_idx + 1):
                    s_lat = round(lat_i / 10.0, 4)
                    lat_overlap = max(0.0, min(s_lat + 0.05, t_lat + 0.125) - max(s_lat - 0.05, t_lat - 0.125))
                    if lat_overlap <= 0.0:
                        continue

                    for lon_i in range(min_lon_idx, max_lon_idx + 1):
                        s_lon = round(lon_i / 10.0, 4)
                        lon_overlap = max(0.0, min(s_lon + 0.05, t_lon + 0.125) - max(s_lon - 0.05, t_lon - 0.125))
                        if lon_overlap <= 0.0:
                            continue

                        key = (s_lat, s_lon, vt, lt)
                        if key in wn3_idx:
                            r = wn3_idx[key]
                            base_r = r
                            weight = lat_overlap * lon_overlap
                            val_sum += r.rainfall_mm_24h * weight
                            weight_sum += weight

                # Strict coverage check: require complete target cell coverage
                # Never inflate weights or accept partial coverage as full cell
                if base_r is not None and abs(weight_sum - SpatialNormalizer.TARGET_CELL_AREA) <= SpatialNormalizer.TOLERANCE:
                    norm_val = val_sum / SpatialNormalizer.TARGET_CELL_AREA
                    new_obs = BenchmarkObservation(
                        forecast_provider=base_r.forecast_provider,
                        model_id=base_r.model_id,
                        run_id=base_r.run_id,
                        init_time=base_r.init_time,
                        valid_time=vt,
                        lead_time_hours=lt,
                        latitude=t_lat,
                        longitude=t_lon,
                        grid_id=format_grid_id(t_lat, t_lon),
                        rainfall_mm_24h=norm_val,
                        reference_rainfall_mm_24h=-1.0,
                        regridding_method="conservative_remapping_0.1_to_0.25",
                        accumulation_method="24h_sum_00Z_to_00Z",
                        source_metadata=dict(base_r.source_metadata or {})
                    )
                    remapped.append(new_obs)

        return remapped


class TemporalAligner:
    """
    Strict intersection alignment enforcing forecast-vintage integrity across
    forecast provider (ECMWF), WeatherNext, and reference ground truth (ERA5).
    Never allows multiple forecast vintages to overwrite each other.
    """
    @staticmethod
    def align(
        wn3_records: List[BenchmarkObservation],
        ecmwf_records: List[Dict],
        era5_records: List[Dict],
        lead_time_tolerance_seconds: float = 60.0
    ) -> List[BenchmarkObservation]:
        # 1. Index ECMWF records by full vintage key: (lat, lon, init_iso, lead_time_hours, valid_iso)
        # Never index solely by valid_time which silently drops distinct vintages.
        ecmwf_idx = {}
        for r in ecmwf_records:
            lat_val = r.get("latitude")
            lon_val = r.get("longitude")
            init_val = r.get("init_time")
            valid_val = r.get("valid_time")
            lt_val = r.get("lead_time_hours")
            precip_val = r.get("precipitation_24h")

            if None in (lat_val, lon_val, init_val, valid_val, lt_val, precip_val):
                continue

            init_dt = _to_utc_dt(init_val)
            valid_dt = _to_utc_dt(valid_val)
            if init_dt is None or valid_dt is None:
                continue

            lt = float(lt_val)
            expected_valid_dt = init_dt + timedelta(hours=lt)
            if abs((expected_valid_dt - valid_dt).total_seconds()) > lead_time_tolerance_seconds:
                continue

            lat = round(float(lat_val), 4)
            lon = round(float(lon_val), 4)
            init_iso = _canonical_iso(init_dt)
            valid_iso = _canonical_iso(valid_dt)

            key = (lat, lon, init_iso, lt, valid_iso)
            ecmwf_idx[key] = r

        # 2. Index ERA5 records by (lat, lon, valid_iso)
        era5_idx = {}
        for r in era5_records:
            lat_val = r.get("latitude")
            lon_val = r.get("longitude")
            valid_val = r.get("valid_time")
            precip_val = r.get("precipitation_24h")

            if None in (lat_val, lon_val, valid_val, precip_val):
                continue

            valid_dt = _to_utc_dt(valid_val)
            if valid_dt is None:
                continue

            lat = round(float(lat_val), 4)
            lon = round(float(lon_val), 4)
            valid_iso = _canonical_iso(valid_dt)
            key = (lat, lon, valid_iso)
            era5_idx[key] = r

        # 3. Match WeatherNext records against identical ECMWF vintage and ERA5 reference
        aligned = []
        for w in wn3_records:
            if None in (w.latitude, w.longitude, w.init_time, w.valid_time, w.lead_time_hours):
                continue

            w_init_dt = _to_utc_dt(w.init_time)
            w_valid_dt = _to_utc_dt(w.valid_time)
            if w_init_dt is None or w_valid_dt is None:
                continue

            w_lt = float(w.lead_time_hours)
            expected_w_valid = w_init_dt + timedelta(hours=w_lt)
            if abs((expected_w_valid - w_valid_dt).total_seconds()) > lead_time_tolerance_seconds:
                continue

            lat = round(float(w.latitude), 4)
            lon = round(float(w.longitude), 4)
            w_init_iso = _canonical_iso(w_init_dt)
            w_valid_iso = _canonical_iso(w_valid_dt)

            ec_key = (lat, lon, w_init_iso, w_lt, w_valid_iso)
            era_key = (lat, lon, w_valid_iso)

            if ec_key in ecmwf_idx and era_key in era5_idx:
                er = ecmwf_idx[ec_key]
                ar = era5_idx[era_key]

                meta = dict(w.source_metadata or {})
                meta["ecmwf_rainfall_mm_24h"] = float(er["precipitation_24h"])
                meta["ecmwf_init_time"] = er["init_time"]
                meta["ecmwf_lead_time_hours"] = float(er["lead_time_hours"])
                meta["ecmwf_valid_time"] = er["valid_time"]
                meta["ecmwf_run_id"] = er.get("run_id", "ecmwf_ifs_run")
                meta["ecmwf_provider"] = "ecmwf"
                meta["weathernext_provider"] = w.forecast_provider

                aligned_w = BenchmarkObservation(
                    forecast_provider=w.forecast_provider,
                    model_id=w.model_id,
                    run_id=w.run_id,
                    init_time=w.init_time,
                    valid_time=w.valid_time,
                    lead_time_hours=w.lead_time_hours,
                    latitude=w.latitude,
                    longitude=w.longitude,
                    grid_id=w.grid_id,
                    rainfall_mm_24h=w.rainfall_mm_24h,
                    reference_rainfall_mm_24h=float(ar["precipitation_24h"]),
                    regridding_method=w.regridding_method,
                    accumulation_method=w.accumulation_method,
                    source_metadata=meta
                )
                aligned.append(aligned_w)

        return aligned
