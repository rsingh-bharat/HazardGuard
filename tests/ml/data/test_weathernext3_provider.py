"""Unit and integration tests for WeatherNext 3 Spatial Statistics Provider."""

import math
import os
import pytest
import numpy as np
import zstandard

from ml.data.providers.factory import get_provider, get_default_provider, PROVIDER_CONFIGS
from ml.data.providers.weathernext3 import (
    WeatherNext3StatisticsProvider,
    WeatherNextAuthError,
    WeatherNextAccessDeniedError,
    WeatherNextNotFoundError,
    WeatherNextMalformedDatasetError,
    WeatherNextCoordinateNotFoundError,
    WeatherNextInvalidLeadError,
)
from ml.data.schema import (
    CanonicalForecastRecord,
    DistributionType,
    ForecastDistribution,
)


def test_weathernext3_factory_routing():
    """Verify that WeatherNext 3 is registered in the factory as a selectable provider."""
    assert "weathernext3_statistics" in PROVIDER_CONFIGS
    config = PROVIDER_CONFIGS["weathernext3_statistics"]
    assert config.native_resolution == 0.1
    assert config.source_name == "Google-WeatherNext3-SpatialStats"
    assert config.capabilities.has_ensemble is True
    assert 24.0 in config.capabilities.supported_lead_times_hours
    assert 48.0 in config.capabilities.supported_lead_times_hours
    assert 72.0 in config.capabilities.supported_lead_times_hours

    # Instantiation check (with dummy token to prevent cli execution)
    prov = get_provider("weathernext3_statistics", access_token="mock_token")
    assert isinstance(prov, WeatherNext3StatisticsProvider)
    assert prov.provider_id == "weathernext3_statistics"


def test_default_provider_remains_ecmwf():
    """Verify strict constraint: default operational provider MUST remain ECMWF."""
    default_prov = get_default_provider()
    assert default_prov.provider_id == "ecmwf_ifs"
    assert default_prov.provider_id != "weathernext3_statistics"


def test_coordinate_indexing():
    """Verify coordinate to 0.1 degree grid index mapping."""
    # South pole (-90) -> index 0
    assert WeatherNext3StatisticsProvider.coordinate_to_indices(-90.0, 0.0) == (0, 0)
    # Equator (0.0) -> index 900
    assert WeatherNext3StatisticsProvider.coordinate_to_indices(0.0, 0.0) == (900, 0)
    # North pole (90.0) -> index 1800
    assert WeatherNext3StatisticsProvider.coordinate_to_indices(90.0, 0.0) == (1800, 0)

    # Bengaluru (12.9716, 77.5946)
    lat_idx, lon_idx = WeatherNext3StatisticsProvider.coordinate_to_indices(12.9716, 77.5946)
    assert lat_idx == int(round((12.9716 + 90.0) * 10))  # 1030
    assert lon_idx == int(round((77.5946 % 360.0) * 10))  # 776
    assert lat_idx == 1030
    assert lon_idx == 776

    # Out of bounds coordinates must raise WeatherNextCoordinateNotFoundError
    with pytest.raises(WeatherNextCoordinateNotFoundError):
        WeatherNext3StatisticsProvider.coordinate_to_indices(-95.0, 77.0)
    with pytest.raises(WeatherNextCoordinateNotFoundError):
        WeatherNext3StatisticsProvider.coordinate_to_indices(95.0, 77.0)


def test_invalid_lead_time():
    """Verify negative or out-of-bounds lead times raise WeatherNextInvalidLeadError."""
    prov = get_provider("weathernext3_statistics", access_token="mock_token")
    with pytest.raises(WeatherNextInvalidLeadError):
        prov.fetch_forecasts(lats=[12.0], lons=[77.0], start_date="2026-01-01", end_date="2026-01-01", lead_time_hours=[-5.0])
    with pytest.raises(WeatherNextInvalidLeadError):
        prov.fetch_forecasts(lats=[12.0], lons=[77.0], start_date="2026-01-01", end_date="2026-01-01", lead_time_hours=[500.0])


def test_offline_fixture_non_constant_hourly_accumulation(tmp_path):
    """Test non-constant hourly accumulation semantics:
    VALID: sum(hourly_mean) = accumulated mean
    INVALID: sum(hourly_p10/p50/p90) = cumulative percentiles (must be None).
    """
    fixture_root = tmp_path / "mock_wn3"
    run_id = "20260101_00hr_01_preds"
    run_dir = fixture_root / run_id / "predictions.zarr"

    cctx = zstandard.ZstdCompressor(level=1)
    stat_vars = (
        "total_precipitation_1hr_p10",
        "total_precipitation_1hr_p25",
        "total_precipitation_1hr_p50",
        "total_precipitation_1hr_p75",
        "total_precipitation_1hr_p90",
        "total_precipitation_1hr_mean",
        "temperature_2m_mean",
        "wind_speed_10m_mean",
        "mean_sea_level_pressure_mean",
    )

    lat_idx, lon_idx = 1030, 776
    lead_hours = 24

    # Non-constant hourly fixtures:
    # Each hour has distinct precipitation rates in meters (m).
    # 0.001 m = 1.0 mm
    expected_sum_mean_mm = 0.0
    sum_hourly_p10_mm = 0.0
    sum_hourly_p50_mm = 0.0
    sum_hourly_p90_mm = 0.0

    for h in range(lead_hours):
        # Hourly varying rates
        hr_p10_m = 0.0001 * (1.0 + (h % 5) * 0.2)
        hr_p25_m = 0.0002 * (1.0 + (h % 5) * 0.2)
        hr_p50_m = 0.0005 * (1.0 + (h % 7) * 0.3)
        hr_p75_m = 0.0008 * (1.0 + (h % 7) * 0.3)
        hr_p90_m = 0.0012 * (1.0 + (h % 4) * 0.4)
        hr_mean_m = 0.0006 * (1.0 + (h % 6) * 0.25)

        expected_sum_mean_mm += hr_mean_m * 1000.0
        sum_hourly_p10_mm += hr_p10_m * 1000.0
        sum_hourly_p50_mm += hr_p50_m * 1000.0
        sum_hourly_p90_mm += hr_p90_m * 1000.0

        for var in stat_vars:
            chunk_dir = run_dir / var / "c" / str(h) / "0"
            chunk_dir.mkdir(parents=True, exist_ok=True)
            chunk_file = chunk_dir / "0"

            arr = np.zeros((1801, 3600), dtype=np.float32)
            if var == "total_precipitation_1hr_p10":
                arr[lat_idx, lon_idx] = hr_p10_m
            elif var == "total_precipitation_1hr_p25":
                arr[lat_idx, lon_idx] = hr_p25_m
            elif var == "total_precipitation_1hr_p50":
                arr[lat_idx, lon_idx] = hr_p50_m
            elif var == "total_precipitation_1hr_p75":
                arr[lat_idx, lon_idx] = hr_p75_m
            elif var == "total_precipitation_1hr_p90":
                arr[lat_idx, lon_idx] = hr_p90_m
            elif var == "total_precipitation_1hr_mean":
                arr[lat_idx, lon_idx] = hr_mean_m
            elif var == "temperature_2m_mean":
                arr[lat_idx, lon_idx] = 295.15  # 22 °C
            elif var == "wind_speed_10m_mean":
                arr[lat_idx, lon_idx] = 5.0     # 5 m/s = 18 km/h
            elif var == "mean_sea_level_pressure_mean":
                arr[lat_idx, lon_idx] = 101300.0  # 1013 hPa

            compressed = cctx.compress(arr.tobytes())
            chunk_file.write_bytes(compressed)

    prov = get_provider("weathernext3_statistics", local_fixture_root=str(fixture_root))

    records = prov.fetch_forecasts(
        lats=[12.9716],
        lons=[77.5946],
        start_date="2026-01-01",
        end_date="2026-01-01",
        lead_time_hours=[24.0],
        run_id=run_id,
    )

    assert len(records) == 1
    rec = records[0]
    assert isinstance(rec, CanonicalForecastRecord)
    assert rec.source == "Google-WeatherNext3-SpatialStats"
    assert rec.lead_time_hours == 24.0
    assert rec.initialization_time == "2026-01-01T00:00:00+00:00"
    assert rec.valid_time == "2026-01-02T00:00:00+00:00"

    # B. Mean accumulation correctness:
    # forecast_rainfall_mm must match accumulated sum of hourly means
    assert math.isclose(rec.forecast_rainfall_mm, expected_sum_mean_mm, abs_tol=1e-3)

    # C. Cumulative p10/p25/p50/p75/p90 remain strictly UNAVAILABLE (None)
    dist = rec.distribution
    assert dist is not None
    assert dist.type == DistributionType.ENSEMBLE_STATISTICS
    assert dist.p10_mm is None
    assert dist.p25_mm is None
    assert dist.p50_mm is None
    assert dist.p75_mm is None
    assert dist.p90_mm is None
    assert math.isclose(dist.mean_mm, expected_sum_mean_mm, abs_tol=1e-3)
    assert dist.accumulation_hours == 24.0

    # D. statistics_quality = "MARGINAL_QUANTILE_ONLY"
    assert dist.statistics_quality == "MARGINAL_QUANTILE_ONLY"

    # CRITICAL: sum(hourly quantiles) IS NOT emitted as cumulative percentiles!
    assert dist.p50_mm != sum_hourly_p50_mm
    assert dist.p10_mm != sum_hourly_p10_mm
    assert dist.p90_mm != sum_hourly_p90_mm
    assert rec.forecast_rainfall_mm != sum_hourly_p50_mm

    # Verify no fake scenario leakage
    assert dist.low_scenario_mm is None
    assert dist.base_scenario_mm is None
    assert dist.high_scenario_mm is None

    # Atmospheric variables
    assert rec.temperature_celsius is not None
    assert math.isclose(rec.temperature_celsius, 22.0, abs_tol=0.1)
    assert rec.wind_speed_kmh is not None
    assert math.isclose(rec.wind_speed_kmh, 18.0, abs_tol=0.1)
    assert rec.surface_pressure_hpa is not None
    assert math.isclose(rec.surface_pressure_hpa, 1013.0, abs_tol=0.1)

    # Provenance
    assert rec.provenance is not None
    assert rec.provenance.run_id == run_id
    assert rec.provenance.init_time == "2026-01-01T00:00:00+00:00"
    assert rec.provenance.run_status == "HISTORICAL"
    assert rec.provenance.init_time_source == "run_id_parsed"


def test_missing_run_raises_not_found(tmp_path):
    """Verify that requesting a nonexistent run raises WeatherNextNotFoundError."""
    fixture_root = tmp_path / "mock_empty"
    fixture_root.mkdir()
    prov = get_provider("weathernext3_statistics", local_fixture_root=str(fixture_root))

    with pytest.raises(WeatherNextNotFoundError):
        prov.fetch_forecasts(
            lats=[12.9716],
            lons=[77.5946],
            start_date="2026-01-01",
            end_date="2026-01-01",
            lead_time_hours=[24.0],
            run_id="nonexistent_run",
        )


def test_unparseable_run_id_raises_malformed_dataset(tmp_path):
    """Verify that a run with unparseable format and no metadata raises WeatherNextMalformedDatasetError
    instead of falling back silently to wall-clock time datetime.now().
    """
    fixture_root = tmp_path / "mock_bad_run"
    bad_run_id = "arbitrary_run_name_without_timestamp"
    run_dir = fixture_root / bad_run_id
    run_dir.mkdir(parents=True)

    prov = get_provider("weathernext3_statistics", local_fixture_root=str(fixture_root))
    with pytest.raises(WeatherNextMalformedDatasetError):
        prov.fetch_forecasts(
            lats=[12.9716],
            lons=[77.5946],
            start_date="2026-01-01",
            end_date="2026-01-01",
            lead_time_hours=[24.0],
            run_id=bad_run_id,
        )


def test_metadata_init_time_precedence(tmp_path):
    """Verify that dataset metadata init_time takes precedence over run_id regex parsing."""
    import json
    fixture_root = tmp_path / "mock_meta_prec"
    run_id = "20260101_00hr_01_preds"
    run_dir = fixture_root / run_id / "predictions.zarr"
    run_dir.mkdir(parents=True)

    # Write .zattrs with an explicit reference time
    meta = {"init_time": "2026-01-01T06:00:00Z"}
    (run_dir / ".zattrs").write_text(json.dumps(meta), encoding="utf-8")

    prov = get_provider("weathernext3_statistics", local_fixture_root=str(fixture_root))
    init_iso, source = prov._read_run_init_time(run_id)
    assert init_iso == "2026-01-01T06:00:00+00:00"
    assert source == "dataset_metadata"


def test_cwd_independent_cache_path():
    """Verify WeatherNext cache directory is absolute and CWD-independent."""
    from ml.config.settings import CACHE_DIR
    prov = get_provider("weathernext3_statistics", access_token="mock_token")
    assert os.path.isabs(prov.cache_dir)
    assert "weathernext3_spatial_stats" in prov.cache_dir
    assert os.path.isabs(CACHE_DIR)


def test_classification_of_run_status():
    """Verify run status classification into HISTORICAL, LATEST_AVAILABLE, STALE/NOT_CURRENT."""
    prov = get_provider("weathernext3_statistics", access_token="mock_token")
    # A date far in the past -> HISTORICAL
    status = prov._classify_run_status("20240101_00hr_01_preds", "2024-01-01T00:00:00+00:00", "2024-01-01")
    assert status == "HISTORICAL"

    # Current date with old init_time -> STALE/NOT_CURRENT
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    old_init = (now - timedelta(days=5)).isoformat()
    today_str = now.strftime("%Y-%m-%d")
    status_stale = prov._classify_run_status("old_init_run", old_init, today_str)
    assert status_stale == "STALE/NOT_CURRENT"

    # Fresh init_time matching today -> LATEST_AVAILABLE
    fresh_init = (now - timedelta(hours=2)).isoformat()
    status_fresh = prov._classify_run_status("fresh_run", fresh_init, today_str)
    assert status_fresh == "LATEST_AVAILABLE"
