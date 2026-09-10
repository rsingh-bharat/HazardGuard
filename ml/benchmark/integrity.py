from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Tuple, Optional, Any
from collections import defaultdict

from ml.benchmark_data.schema import BenchmarkObservation
from ml.benchmark.schema import BenchmarkPairRecord, CoverageStatistics, BenchmarkConfig


def parse_utc_datetime(dt_str: str) -> datetime:
    """Parses an ISO-8601 or standard date/time string into a UTC datetime."""
    clean_str = dt_str.strip()
    if clean_str.endswith("Z"):
        clean_str = clean_str[:-1] + "+00:00"
    
    # Handle dates without time (default to 00:00:00 UTC)
    if len(clean_str) == 10 and clean_str.count("-") == 2:
        clean_str = f"{clean_str}T00:00:00+00:00"
        
    dt = datetime.fromisoformat(clean_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def validate_lead_time_consistency(
    init_time_str: str,
    lead_time_hours: float,
    valid_time_str: str,
    tolerance_seconds: float = 60.0
) -> bool:
    """
    Validates that:
    init_time + lead_time_hours == valid_time
    within tolerance_seconds.
    """
    try:
        init_dt = parse_utc_datetime(init_time_str)
        valid_dt = parse_utc_datetime(valid_time_str)
        expected_valid_dt = init_dt + timedelta(hours=lead_time_hours)
        diff_seconds = abs((expected_valid_dt - valid_dt).total_seconds())
        return diff_seconds <= tolerance_seconds
    except Exception:
        return False


def validate_equivalent_vintages(
    ecmwf_init: str,
    ecmwf_lead_time_hours: float,
    ecmwf_valid: str,
    weathernext_init: str,
    weathernext_lead_time_hours: float,
    weathernext_valid: str,
    tolerance_seconds: float = 60.0
) -> Tuple[bool, Optional[str]]:
    """
    Enforces forecast-vintage integrity:
    1. ECMWF init_time + ECMWF lead_time_hours == valid_time
    2. WeatherNext init_time + WeatherNext lead_time_hours == valid_time
    3. ECMWF init_time == WeatherNext init_time
    4. ECMWF lead_time_hours == WeatherNext lead_time_hours
    5. ECMWF valid_time == WeatherNext valid_time
    """
    # Check 1: ECMWF internal consistency
    if not validate_lead_time_consistency(ecmwf_init, ecmwf_lead_time_hours, ecmwf_valid, tolerance_seconds):
        return False, f"ECMWF lead time inconsistent: {ecmwf_init} + {ecmwf_lead_time_hours}h != {ecmwf_valid}"

    # Check 2: WeatherNext internal consistency
    if not validate_lead_time_consistency(weathernext_init, weathernext_lead_time_hours, weathernext_valid, tolerance_seconds):
        return False, f"WeatherNext lead time inconsistent: {weathernext_init} + {weathernext_lead_time_hours}h != {weathernext_valid}"

    # Check 3: Initialization time equivalence
    try:
        ec_init_dt = parse_utc_datetime(ecmwf_init)
        wn_init_dt = parse_utc_datetime(weathernext_init)
        if abs((ec_init_dt - wn_init_dt).total_seconds()) > tolerance_seconds:
            return False, f"Init time mismatch between vintages: ECMWF={ecmwf_init} vs WeatherNext={weathernext_init}"
    except Exception as e:
        return False, f"Init time parsing error: {e}"

    # Check 4: Lead time hours equivalence
    if abs(ecmwf_lead_time_hours - weathernext_lead_time_hours) > 1e-4:
        return False, f"Lead time mismatch: ECMWF={ecmwf_lead_time_hours}h vs WeatherNext={weathernext_lead_time_hours}h"

    # Check 5: Valid time equivalence
    try:
        ec_valid_dt = parse_utc_datetime(ecmwf_valid)
        wn_valid_dt = parse_utc_datetime(weathernext_valid)
        if abs((ec_valid_dt - wn_valid_dt).total_seconds()) > tolerance_seconds:
            return False, f"Valid time mismatch: ECMWF={ecmwf_valid} vs WeatherNext={weathernext_valid}"
    except Exception as e:
        return False, f"Valid time parsing error: {e}"

    return True, None


def is_complete_24h_accumulation_window(
    valid_time_str: str,
    reference_cutoff_dt: Optional[datetime] = None
) -> bool:
    """
    Verifies that the valid_time represents a complete 24-hour accumulation window.
    An incomplete current/future day or an accumulation ending past reference cutoff is rejected.
    """
    try:
        valid_dt = parse_utc_datetime(valid_time_str)
        # Window starts 24h before valid_dt
        # If reference cutoff is provided, valid_dt must not exceed it
        if reference_cutoff_dt is not None:
            if valid_dt > reference_cutoff_dt:
                return False
        # Window cannot extend beyond current UTC timestamp
        now_utc = datetime.now(timezone.utc)
        if valid_dt > now_utc:
            return False
        return True
    except Exception:
        return False


def build_and_validate_pairs(
    aligned_observations: List[BenchmarkObservation],
    config: BenchmarkConfig,
    reference_cutoff_dt: Optional[datetime] = None,
    raw_counts_before_intersection: Optional[Dict[str, int]] = None
) -> Tuple[List[BenchmarkPairRecord], CoverageStatistics]:
    """
    Validates vintage integrity, excludes incomplete accumulation windows,
    detects temporal gaps, and constructs verified BenchmarkPairRecord instances.
    """
    if raw_counts_before_intersection is None:
        raw_counts_before_intersection = {
            "ecmwf": len(aligned_observations),
            "weathernext": len(aligned_observations),
            "era5": len(aligned_observations)
        }

    # Resolve effective cutoff date: explicit argument > config.reference_cutoff_dt > config.evaluation_end
    effective_cutoff_dt = reference_cutoff_dt
    if effective_cutoff_dt is None and config.reference_cutoff_dt:
        effective_cutoff_dt = parse_utc_datetime(config.reference_cutoff_dt)
    if effective_cutoff_dt is None and config.evaluation_end:
        effective_cutoff_dt = parse_utc_datetime(config.evaluation_end)

    total_aligned = len(aligned_observations)
    rejected_vintage = 0
    rejected_incomplete = 0
    
    candidate_pairs: List[BenchmarkPairRecord] = []

    for obs in aligned_observations:
        # Extract ECMWF attributes strictly from source_metadata without falling back to WeatherNext
        meta = obs.source_metadata or {}
        ecmwf_rainfall = meta.get("ecmwf_rainfall_mm_24h")
        ecmwf_init = meta.get("ecmwf_init_time")
        ecmwf_lt = meta.get("ecmwf_lead_time_hours")
        ecmwf_run_id = meta.get("ecmwf_run_id", "ecmwf_ifs_run")

        # Explicit rejection if ECMWF metadata or WeatherNext timing is missing
        if None in (ecmwf_rainfall, ecmwf_init, ecmwf_lt, obs.init_time, obs.valid_time, obs.lead_time_hours):
            rejected_vintage += 1
            continue

        wn_rainfall = obs.rainfall_mm_24h
        era5_rainfall = obs.reference_rainfall_mm_24h

        # Strict non-negative check and missing value check (e.g. -1.0 placeholder)
        if era5_rainfall < 0.0 or wn_rainfall < 0.0 or float(ecmwf_rainfall) < 0.0:
            rejected_vintage += 1
            continue

        # 1. Forecast-vintage integrity check
        is_valid_vintage, _ = validate_equivalent_vintages(
            ecmwf_init=str(ecmwf_init),
            ecmwf_lead_time_hours=float(ecmwf_lt),
            ecmwf_valid=obs.valid_time,
            weathernext_init=obs.init_time,
            weathernext_lead_time_hours=obs.lead_time_hours,
            weathernext_valid=obs.valid_time
        )
        if not is_valid_vintage:
            rejected_vintage += 1
            continue

        # 2. Complete 24h accumulation window check
        if config.require_complete_24h_windows:
            if not is_complete_24h_accumulation_window(obs.valid_time, effective_cutoff_dt):
                rejected_incomplete += 1
                continue

        pair_record = BenchmarkPairRecord(
            grid_id=obs.grid_id,
            latitude=obs.latitude,
            longitude=obs.longitude,
            init_time=obs.init_time,
            valid_time=obs.valid_time,
            lead_time_hours=obs.lead_time_hours,
            ecmwf_rainfall_mm_24h=float(ecmwf_rainfall),
            weathernext_rainfall_mm_24h=float(wn_rainfall),
            reference_rainfall_mm_24h=float(era5_rainfall),
            ecmwf_run_id=ecmwf_run_id,
            ecmwf_model_id="ecmwf_ifs",
            weathernext_run_id=obs.run_id,
            weathernext_model_id=obs.model_id,
            regridding_method=obs.regridding_method,
            accumulation_method=obs.accumulation_method,
            reference_source=config.reference_source,
            provenance={
                "ecmwf_init_time": str(ecmwf_init),
                "weathernext_init_time": obs.init_time,
                "ecmwf_run_id": ecmwf_run_id,
                "weathernext_run_id": obs.run_id,
                "regridding_method": obs.regridding_method,
                "accumulation_method": obs.accumulation_method,
            }
        )
        candidate_pairs.append(pair_record)

    # Filter by user-supplied evaluation window if given
    filtered_pairs: List[BenchmarkPairRecord] = []
    
    start_dt = parse_utc_datetime(config.evaluation_start) if config.evaluation_start else None
    end_dt = parse_utc_datetime(config.evaluation_end) if config.evaluation_end else None

    for pair in candidate_pairs:
        v_dt = parse_utc_datetime(pair.valid_time)
        if start_dt and v_dt < start_dt:
            continue
        if end_dt and v_dt > end_dt:
            continue
        filtered_pairs.append(pair)

    # Determine complete 24-hour evaluation interval and detect temporal gaps
    if filtered_pairs:
        all_valid_dts = [parse_utc_datetime(p.valid_time) for p in filtered_pairs]
        actual_start_dt = min(all_valid_dts)
        actual_end_dt = max(all_valid_dts)
        actual_start_str = actual_start_dt.isoformat()
        actual_end_str = actual_end_dt.isoformat()
        
        # Count unique complete 24-hour accumulation periods (by date / valid_time)
        unique_windows = set(p.valid_time for p in filtered_pairs)
        num_complete_windows = len(unique_windows)
        
        window_start = start_dt if start_dt is not None else actual_start_dt
        window_end = end_dt if end_dt is not None else actual_end_dt
    else:
        actual_start_str = config.evaluation_start or ""
        actual_end_str = config.evaluation_end or ""
        num_complete_windows = 0
        unique_windows = set()
        window_start = start_dt
        window_end = end_dt

    # Generate expected complete 24h accumulation windows and detect internal gaps
    expected_windows_list: List[str] = []
    missing_windows: List[str] = []
    if window_start and window_end and window_start <= window_end:
        step_hours = config.lead_time_hours if config.lead_time_hours > 0 else 24.0
        curr_dt = window_start
        observed_iso_set = set(parse_utc_datetime(vt).isoformat() for vt in unique_windows)
        while curr_dt <= window_end:
            curr_iso = curr_dt.isoformat()
            expected_windows_list.append(curr_iso)
            if curr_iso not in observed_iso_set:
                missing_windows.append(curr_iso)
            curr_dt += timedelta(hours=step_hours)

    expected_count = len(expected_windows_list)
    cov_ratio = (num_complete_windows / expected_count) if expected_count > 0 else (1.0 if num_complete_windows == 0 else 0.0)
    cov_status = "complete" if (expected_count > 0 and len(missing_windows) == 0) else ("coverage_incomplete" if expected_count > 0 else "empty")

    cutoff_str = effective_cutoff_dt.isoformat() if effective_cutoff_dt else None

    coverage_stats = CoverageStatistics(
        total_candidate_windows=expected_count if expected_count > 0 else num_complete_windows,
        raw_records_before_intersection=raw_counts_before_intersection,
        aligned_records=total_aligned,
        rejected_vintage_records=rejected_vintage,
        rejected_incomplete_window_records=rejected_incomplete,
        retained_benchmark_records=len(filtered_pairs),
        number_of_complete_windows=num_complete_windows,
        evaluation_start=actual_start_str,
        evaluation_end=actual_end_str,
        expected_windows=expected_count,
        missing_windows=missing_windows,
        coverage_ratio=cov_ratio,
        coverage_status=cov_status,
        reference_cutoff_utc=cutoff_str,
    )

    return filtered_pairs, coverage_stats

