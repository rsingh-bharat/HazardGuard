import pytest
import numpy as np
from ml.benchmark.schema import BenchmarkPairRecord
from ml.benchmark.metrics import (
    compute_mae,
    compute_rmse,
    compute_mbe,
    compute_pearson_r,
    compute_pooled_metrics,
    compute_spatial_metrics,
    compute_temporal_metrics,
)


def test_mae_rmse_bias_correctness():
    # Synthetic fixture
    # Forecasts:  [10.0, 20.0, 30.0]
    # Reference:  [12.0, 18.0, 35.0]
    # Errors (f - ref): [-2.0, +2.0, -5.0]
    # Abs errors: [2.0, 2.0, 5.0] -> MAE = 9.0 / 3 = 3.0
    # Squared errors: [4.0, 4.0, 25.0] -> 33.0 / 3 = 11.0 -> RMSE = sqrt(11) = 3.31662479
    # Bias: (-2.0 + 2.0 - 5.0) / 3 = -1.66666667
    f = np.array([10.0, 20.0, 30.0])
    r = np.array([12.0, 18.0, 35.0])

    mae = compute_mae(f, r)
    rmse = compute_rmse(f, r)
    mbe = compute_mbe(f, r)

    assert pytest.approx(mae, 1e-6) == 3.0
    assert pytest.approx(rmse, 1e-6) == np.sqrt(11.0)
    assert pytest.approx(mbe, 1e-6) == -5.0 / 3.0


def test_pearson_correlation_correctness():
    # Perfect positive correlation
    f = np.array([1.0, 2.0, 3.0, 4.0])
    r = np.array([2.0, 4.0, 6.0, 8.0])
    assert pytest.approx(compute_pearson_r(f, r), 1e-6) == 1.0

    # Perfect negative correlation
    r_neg = np.array([8.0, 6.0, 4.0, 2.0])
    assert pytest.approx(compute_pearson_r(f, r_neg), 1e-6) == -1.0


def test_zero_variance_pearson_returns_none():
    # Forecast variance is zero (constant forecast) -> r is undefined -> MUST return None, NOT NaN
    f = np.array([5.0, 5.0, 5.0, 5.0])
    r = np.array([1.0, 2.0, 3.0, 4.0])
    assert compute_pearson_r(f, r) is None

    # Reference variance is zero
    f2 = np.array([1.0, 2.0, 3.0, 4.0])
    r2 = np.array([0.0, 0.0, 0.0, 0.0])
    assert compute_pearson_r(f2, r2) is None


def test_zero_denominator_empty_inputs():
    f = np.array([])
    r = np.array([])
    assert compute_mae(f, r) is None
    assert compute_rmse(f, r) is None
    assert compute_mbe(f, r) is None
    assert compute_pearson_r(f, r) is None


def test_spatial_and_temporal_segregation():
    # 2 grid cells ("g1", "g2"), 2 time steps ("t1", "t2")
    records = [
        # Time t1
        BenchmarkPairRecord("g1", 28.0, 77.0, "2026-01-01T00", "2026-01-02T00", 24.0, 10.0, 12.0, 10.0, "r1"),
        BenchmarkPairRecord("g2", 28.25, 77.25, "2026-01-01T00", "2026-01-02T00", 24.0, 20.0, 25.0, 20.0, "r1"),
        # Time t2
        BenchmarkPairRecord("g1", 28.0, 77.0, "2026-01-02T00", "2026-01-03T00", 24.0, 15.0, 15.0, 10.0, "r2"),
        BenchmarkPairRecord("g2", 28.25, 77.25, "2026-01-02T00", "2026-01-03T00", 24.0, 30.0, 30.0, 20.0, "r2"),
    ]

    # 1. Pooled: 4 samples
    pooled_ec = compute_pooled_metrics(records, "ecmwf")
    assert pooled_ec.sample_count == 4

    # 2. Spatial: 2 grid cells evaluated across time
    spatial_ec = compute_spatial_metrics(records, "ecmwf")
    assert spatial_ec.num_grid_cells == 2
    assert "g1" in spatial_ec.per_cell_metrics
    assert "g2" in spatial_ec.per_cell_metrics
    assert spatial_ec.aggregation_description == "Per-grid-cell time-series verification, then aggregated spatially"

    # 3. Temporal: 2 time steps evaluated across space
    temporal_ec = compute_temporal_metrics(records, "ecmwf")
    assert temporal_ec.num_time_steps == 2
    assert "2026-01-02T00" in temporal_ec.per_time_metrics
    assert "2026-01-03T00" in temporal_ec.per_time_metrics
    assert temporal_ec.aggregation_description == "Per-valid-time spatial verification, then aggregated temporally"
