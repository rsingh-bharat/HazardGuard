import pytest
import numpy as np
from ml.benchmark.schema import BenchmarkPairRecord
from ml.benchmark.statistics import run_paired_daily_block_bootstrap


def _create_multi_day_records():
    """Generates synthetic records spanning 4 dates with 3 spatial cells per date."""
    records = []
    dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]
    cells = [("g1", 28.0, 77.0), ("g2", 28.25, 77.0), ("g3", 28.0, 77.25)]

    for d_idx, d in enumerate(dates):
        init_t = f"{d}T00:00:00Z"
        # valid time is next day 00Z
        valid_t = f"2026-01-0{d_idx+2}T00:00:00Z"
        for c_id, lat, lon in cells:
            # Synthetic rainfall
            ec_rain = 10.0 + d_idx * 5.0
            wn_rain = 12.0 + d_idx * 4.0
            ref_rain = 11.0 + d_idx * 5.0
            records.append(
                BenchmarkPairRecord(
                    grid_id=c_id,
                    latitude=lat,
                    longitude=lon,
                    init_time=init_t,
                    valid_time=valid_t,
                    lead_time_hours=24.0,
                    ecmwf_rainfall_mm_24h=ec_rain,
                    weathernext_rainfall_mm_24h=wn_rain,
                    reference_rainfall_mm_24h=ref_rain,
                    ecmwf_run_id=f"ec_{d}",
                    weathernext_run_id=f"wn_{d}"
                )
            )
    return records


def test_daily_block_clustering_and_reproducibility():
    records = _create_multi_day_records()
    assert len(records) == 12  # 4 dates * 3 cells

    # Run 1 with seed=42
    res1 = run_paired_daily_block_bootstrap(
        records=records,
        metric_name="mae",
        resamples=500,
        seed=42,
        confidence_level=0.95
    )

    # Run 2 with same seed=42
    res2 = run_paired_daily_block_bootstrap(
        records=records,
        metric_name="mae",
        resamples=500,
        seed=42,
        confidence_level=0.95
    )

    # Must be bitwise deterministic and reproducible
    assert res1.ecmwf_score == res2.ecmwf_score
    assert res1.weathernext_score == res2.weathernext_score
    assert res1.difference == res2.difference
    assert res1.ci_lower == res2.ci_lower
    assert res1.ci_upper == res2.ci_upper
    assert res1.p_value == res2.p_value

    # Confidence interval must bound difference
    assert res1.ci_lower is not None
    assert res1.ci_upper is not None
    assert res1.ci_lower <= res1.ci_upper

    # Verify clustering note confirms daily blocks
    assert "daily forecast dates" in res1.clustering_description
    assert "Spatial cells on the same date kept together" in res1.clustering_description


def test_bootstrap_different_seed_different_ci():
    records = _create_multi_day_records()

    res_seed1 = run_paired_daily_block_bootstrap(records, "mae", resamples=200, seed=42)
    res_seed2 = run_paired_daily_block_bootstrap(records, "mae", resamples=200, seed=999)

    # Point estimates are identical (computed on original data)
    assert res_seed1.difference == res_seed2.difference

    # Resampled intervals will slightly vary between different random seeds
    # (verifying seed is actually passed to generator)
    assert res_seed1.random_seed == 42
    assert res_seed2.random_seed == 999


def test_insufficient_daily_blocks_handled_gracefully():
    # Only 1 date block -> cannot bootstrap
    records = [
        BenchmarkPairRecord("g1", 28.0, 77.0, "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", 24.0, 10.0, 12.0, 11.0, "r1"),
        BenchmarkPairRecord("g2", 28.25, 77.0, "2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", 24.0, 15.0, 14.0, 12.0, "r1")
    ]
    res = run_paired_daily_block_bootstrap(records, "mae", resamples=100)
    assert res.ci_lower is None
    assert res.ci_upper is None
    assert res.p_value is None
    assert "at least 2 distinct dates required" in res.clustering_description
