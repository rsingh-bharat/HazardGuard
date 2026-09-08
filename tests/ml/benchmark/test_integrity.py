import pytest
from datetime import datetime, timezone, timedelta
from ml.benchmark_data.schema import BenchmarkObservation
from ml.benchmark.schema import BenchmarkConfig
from ml.benchmark.integrity import (
    validate_lead_time_consistency,
    validate_equivalent_vintages,
    is_complete_24h_accumulation_window,
    build_and_validate_pairs,
    parse_utc_datetime,
)


def test_forecast_vintage_consistency():
    # 2026-01-01T00:00:00Z + 24h = 2026-01-02T00:00:00Z -> Consistent
    assert validate_lead_time_consistency("2026-01-01T00:00:00Z", 24.0, "2026-01-02T00:00:00Z")
    
    # Inconsistent lead time (says +24h but valid is +48h)
    assert not validate_lead_time_consistency("2026-01-01T00:00:00Z", 24.0, "2026-01-03T00:00:00Z")


def test_vintage_mismatch_rejected_different_init_times():
    # Both arrive at valid_time 2026-01-02T00:00:00Z, but ECMWF was initialized at 00Z (+24h)
    # and WeatherNext was initialized at 12Z (+12h) -> MUST BE REJECTED!
    is_valid, reason = validate_equivalent_vintages(
        ecmwf_init="2026-01-01T00:00:00Z",
        ecmwf_lead_time_hours=24.0,
        ecmwf_valid="2026-01-02T00:00:00Z",
        weathernext_init="2026-01-01T12:00:00Z",
        weathernext_lead_time_hours=12.0,
        weathernext_valid="2026-01-02T00:00:00Z",
    )
    assert not is_valid
    assert "Init time mismatch" in reason or "Lead time mismatch" in reason


def test_vintage_mismatch_rejected_different_lead_times():
    # ECMWF initialized at 00Z with +24h vs WeatherNext initialized at 00Z with +48h (different valid times)
    is_valid, reason = validate_equivalent_vintages(
        ecmwf_init="2026-01-01T00:00:00Z",
        ecmwf_lead_time_hours=24.0,
        ecmwf_valid="2026-01-02T00:00:00Z",
        weathernext_init="2026-01-01T00:00:00Z",
        weathernext_lead_time_hours=48.0,
        weathernext_valid="2026-01-03T00:00:00Z",
    )
    assert not is_valid
    assert "Lead time mismatch" in reason or "Valid time mismatch" in reason


def test_equivalent_vintage_accepted():
    is_valid, reason = validate_equivalent_vintages(
        ecmwf_init="2026-01-01T00:00:00Z",
        ecmwf_lead_time_hours=24.0,
        ecmwf_valid="2026-01-02T00:00:00Z",
        weathernext_init="2026-01-01T00:00:00Z",
        weathernext_lead_time_hours=24.0,
        weathernext_valid="2026-01-02T00:00:00Z",
    )
    assert is_valid
    assert reason is None


def test_incomplete_final_24h_window_excluded():
    # Cutoff at 2026-01-03T00:00:00Z
    cutoff = datetime(2026, 1, 3, 0, 0, tzinfo=timezone.utc)
    
    # Valid window before or at cutoff -> True
    assert is_complete_24h_accumulation_window("2026-01-03T00:00:00Z", reference_cutoff_dt=cutoff)
    
    # Valid window past cutoff (e.g. incomplete current day 2026-01-03T12:00:00Z or 2026-01-04) -> False
    assert not is_complete_24h_accumulation_window("2026-01-04T00:00:00Z", reference_cutoff_dt=cutoff)


def test_build_and_validate_pairs_filters_violations():
    config = BenchmarkConfig(lead_time_hours=24.0, require_complete_24h_windows=True)
    cutoff = datetime(2026, 1, 2, 12, 0, tzinfo=timezone.utc)
    
    observations = [
        # 1. Valid pair
        BenchmarkObservation(
            forecast_provider="weathernext3_statistics",
            model_id="wn3", run_id="run_1",
            init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
            lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="grid_28_77",
            rainfall_mm_24h=12.5, reference_rainfall_mm_24h=10.0,
            source_metadata={
                "ecmwf_rainfall_mm_24h": 11.0,
                "ecmwf_init_time": "2026-01-01T00:00:00Z",
                "ecmwf_lead_time_hours": 24.0,
                "ecmwf_run_id": "ec_run_1"
            }
        ),
        # 2. Inconsistent ECMWF lead time
        BenchmarkObservation(
            forecast_provider="weathernext3_statistics",
            model_id="wn3", run_id="run_2",
            init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
            lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="grid_28_77",
            rainfall_mm_24h=12.5, reference_rainfall_mm_24h=10.0,
            source_metadata={
                "ecmwf_rainfall_mm_24h": 11.0,
                "ecmwf_init_time": "2026-01-01T12:00:00Z", # Mismatch!
                "ecmwf_lead_time_hours": 24.0,
                "ecmwf_run_id": "ec_run_2"
            }
        ),
        # 3. Beyond cutoff (incomplete window)
        BenchmarkObservation(
            forecast_provider="weathernext3_statistics",
            model_id="wn3", run_id="run_3",
            init_time="2026-01-02T00:00:00Z", valid_time="2026-01-03T00:00:00Z",
            lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="grid_28_77",
            rainfall_mm_24h=15.0, reference_rainfall_mm_24h=14.0,
            source_metadata={
                "ecmwf_rainfall_mm_24h": 14.5,
                "ecmwf_init_time": "2026-01-02T00:00:00Z",
                "ecmwf_lead_time_hours": 24.0,
                "ecmwf_run_id": "ec_run_3"
            }
        )
    ]

    pairs, coverage = build_and_validate_pairs(observations, config, reference_cutoff_dt=cutoff)
    assert len(pairs) == 1
    assert pairs[0].grid_id == "grid_28_77"
    assert pairs[0].ecmwf_rainfall_mm_24h == 11.0
    assert pairs[0].weathernext_rainfall_mm_24h == 12.5
    assert coverage.rejected_vintage_records == 1
    assert coverage.rejected_incomplete_window_records == 1
    assert coverage.retained_benchmark_records == 1


def test_missing_ecmwf_lead_time_rejected():
    """Prove that missing ECMWF lead_time_hours causes explicit pair rejection without fallback."""
    config = BenchmarkConfig(lead_time_hours=24.0)
    obs = BenchmarkObservation(
        forecast_provider="weathernext3_statistics",
        model_id="wn3", run_id="r1",
        init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
        lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
        rainfall_mm_24h=10.0, reference_rainfall_mm_24h=10.0,
        source_metadata={
            "ecmwf_rainfall_mm_24h": 10.0,
            "ecmwf_init_time": "2026-01-01T00:00:00Z",
            # "ecmwf_lead_time_hours" is intentionally MISSING
        }
    )
    pairs, coverage = build_and_validate_pairs([obs], config)
    assert len(pairs) == 0, "Missing ECMWF lead time must be explicitly rejected!"
    assert coverage.rejected_vintage_records == 1


def test_missing_ecmwf_init_time_rejected():
    """Prove that missing ECMWF init_time causes explicit pair rejection without fallback."""
    config = BenchmarkConfig(lead_time_hours=24.0)
    obs = BenchmarkObservation(
        forecast_provider="weathernext3_statistics",
        model_id="wn3", run_id="r1",
        init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
        lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
        rainfall_mm_24h=10.0, reference_rainfall_mm_24h=10.0,
        source_metadata={
            "ecmwf_rainfall_mm_24h": 10.0,
            # "ecmwf_init_time" is intentionally MISSING
            "ecmwf_lead_time_hours": 24.0,
        }
    )
    pairs, coverage = build_and_validate_pairs([obs], config)
    assert len(pairs) == 0, "Missing ECMWF init time must be explicitly rejected!"
    assert coverage.rejected_vintage_records == 1


def test_mismatched_ecmwf_weathernext_metadata_rejected():
    """Prove that mismatched forecast vintages between ECMWF and WeatherNext are rejected."""
    config = BenchmarkConfig(lead_time_hours=24.0)
    obs = BenchmarkObservation(
        forecast_provider="weathernext3_statistics",
        model_id="wn3", run_id="r1",
        init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
        lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
        rainfall_mm_24h=10.0, reference_rainfall_mm_24h=10.0,
        source_metadata={
            "ecmwf_rainfall_mm_24h": 10.0,
            "ecmwf_init_time": "2026-01-01T12:00:00Z",  # Mismatch with WN init
            "ecmwf_lead_time_hours": 12.0,              # Mismatch with WN lead
        }
    )
    pairs, coverage = build_and_validate_pairs([obs], config)
    assert len(pairs) == 0, "Mismatched vintages must be rejected!"
    assert coverage.rejected_vintage_records == 1


def test_internal_temporal_gap_detected_and_reported():
    """Prove that temporal gaps inside the evaluation window are explicitly detected and reported."""
    config = BenchmarkConfig(
        evaluation_start="2026-01-01T00:00:00Z",
        evaluation_end="2026-01-04T00:00:00Z",
        lead_time_hours=24.0
    )
    # Day 1: 2026-01-01 -> valid 2026-01-02
    # Day 2: 2026-01-02 -> valid 2026-01-03
    # Day 3 (2026-01-03 -> valid 2026-01-04) is MISSING
    observations = [
        BenchmarkObservation(
            forecast_provider="weathernext3_statistics", model_id="wn3", run_id="r1",
            init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
            lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
            rainfall_mm_24h=10.0, reference_rainfall_mm_24h=10.0,
            source_metadata={"ecmwf_rainfall_mm_24h": 10.0, "ecmwf_init_time": "2026-01-01T00:00:00Z", "ecmwf_lead_time_hours": 24.0}
        ),
        BenchmarkObservation(
            forecast_provider="weathernext3_statistics", model_id="wn3", run_id="r2",
            init_time="2026-01-02T00:00:00Z", valid_time="2026-01-03T00:00:00Z",
            lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
            rainfall_mm_24h=10.0, reference_rainfall_mm_24h=10.0,
            source_metadata={"ecmwf_rainfall_mm_24h": 10.0, "ecmwf_init_time": "2026-01-02T00:00:00Z", "ecmwf_lead_time_hours": 24.0}
        ),
    ]

    pairs, coverage = build_and_validate_pairs(observations, config)
    assert len(pairs) == 2
    assert coverage.number_of_complete_windows == 2
    assert coverage.expected_windows == 4  # 01, 02, 03, 04
    assert len(coverage.missing_windows) == 2  # 01 and 04 valid times are missing
    assert coverage.coverage_status == "coverage_incomplete"
    assert coverage.coverage_ratio == 0.5


def test_incomplete_final_day_excluded_by_cutoff():
    """Prove that an incomplete final day beyond the cutoff is rejected."""
    cutoff = datetime(2026, 1, 3, 0, 0, tzinfo=timezone.utc)
    config = BenchmarkConfig(lead_time_hours=24.0, require_complete_24h_windows=True)

    obs_partial = BenchmarkObservation(
        forecast_provider="weathernext3_statistics", model_id="wn3", run_id="r1",
        init_time="2026-01-02T12:00:00Z", valid_time="2026-01-03T12:00:00Z",  # 12h past 00Z cutoff
        lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
        rainfall_mm_24h=10.0, reference_rainfall_mm_24h=10.0,
        source_metadata={"ecmwf_rainfall_mm_24h": 10.0, "ecmwf_init_time": "2026-01-02T12:00:00Z", "ecmwf_lead_time_hours": 24.0}
    )

    pairs, coverage = build_and_validate_pairs([obs_partial], config, reference_cutoff_dt=cutoff)
    assert len(pairs) == 0
    assert coverage.rejected_incomplete_window_records == 1

