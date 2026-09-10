"""Tests for WeatherNext 3 Provider API Integration, Selection, and Safety Constraints."""

import datetime
import math
import pytest
import numpy as np
import zstandard
from fastapi.testclient import TestClient

from ml.api.main import app, ForecastSnapshot
from ml.api.impact import ImpactRequest, get_impact
from ml.data.providers.factory import get_provider, PROVIDER_CONFIGS
from ml.data.schema import DistributionType

client = TestClient(app)


@pytest.fixture
def mock_wn3_fixture(tmp_path, monkeypatch):
    """Create a temporary local WeatherNext 3 fixture and route provider to it."""
    fixture_root = tmp_path / "mock_wn3_api"
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    run_id = f"{now_utc.strftime('%Y%m%d')}_00hr_01_preds"
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

    for var in stat_vars:
        for h in range(lead_hours):
            chunk_dir = run_dir / var / "c" / str(h) / "0"
            chunk_dir.mkdir(parents=True, exist_ok=True)
            chunk_file = chunk_dir / "0"

            arr = np.zeros((1801, 3600), dtype=np.float32)
            if var == "total_precipitation_1hr_mean":
                arr[lat_idx, lon_idx] = 0.001  # 1.0 mm/hr -> 24.0 mm sum
            elif var == "total_precipitation_1hr_p50":
                arr[lat_idx, lon_idx] = 0.0008 # 0.8 mm/hr -> 19.2 mm sum (MUST NOT BE USED)
            elif var == "temperature_2m_mean":
                arr[lat_idx, lon_idx] = 295.15  # 22 °C
            elif var == "wind_speed_10m_mean":
                arr[lat_idx, lon_idx] = 5.0     # 18 km/h
            elif var == "mean_sea_level_pressure_mean":
                arr[lat_idx, lon_idx] = 101300.0  # 1013 hPa

            compressed = cctx.compress(arr.tobytes())
            chunk_file.write_bytes(compressed)

    # Monkeypatch factory to use fixture
    orig_get_provider = get_provider
    def patched_get_provider(provider_id: str, **kwargs):
        if provider_id == "weathernext3_statistics":
            kwargs["local_fixture_root"] = str(fixture_root)
        return orig_get_provider(provider_id, **kwargs)

    monkeypatch.setattr("ml.api.main.get_provider", patched_get_provider)
    return str(fixture_root)


def test_provider_runtime_selection_validation():
    """Verify provider selection validation rules:
    - null -> default ECMWF
    - ecmwf_ifs -> ECMWF
    - weathernext3_statistics -> WeatherNext 3
    - unsupported string -> 422 Unprocessable Entity
    """
    # 1. Invalid provider -> 422
    resp_invalid = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24,
        "provider": "unsupported_nwp_provider"
    })
    assert resp_invalid.status_code == 422
    assert "Unsupported provider" in resp_invalid.text

    # 2. null / omitted provider -> 200 with ecmwf_ifs
    resp_default = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24
    })
    assert resp_default.status_code == 200
    data_default = resp_default.json()
    assert data_default["provider"] == "ecmwf_ifs"
    assert data_default["distribution_type"] == "SINGLE_VALUE"

    # 3. Explicit ecmwf_ifs -> 200 with ecmwf_ifs
    resp_ecmwf = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24,
        "provider": "ecmwf_ifs"
    })
    assert resp_ecmwf.status_code == 200
    assert resp_ecmwf.json()["provider"] == "ecmwf_ifs"


def test_weathernext3_skips_xgboost_and_not_fallback(mock_wn3_fixture):
    """Verify:
    When provider="weathernext3_statistics" is selected:
    - XGBoost is skipped (no feature extraction / model evaluation)
    - provider="WeatherNext3"
    - model_id="RAW_WEATHERNEXT3"
    - model_status="RAW_NWP_WEATHERNEXT3"
    - fallback=False (WeatherNext is NOT a fallback!)
    - ml_correction_applied=False
    - ml_correction_status="NOT_APPLIED_INCOMPATIBLE_FEATURE_SCHEMA"
    - rainfall_mm is canonical accumulated mean (24.0 mm, NOT 19.2 mm)
    """
    resp = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24,
        "provider": "weathernext3_statistics"
    })
    assert resp.status_code == 200
    snap = resp.json()

    assert snap["provider"] == "WeatherNext3"
    assert snap["provider_model"] == "weathernext_3_0_0_statistics"
    assert snap["model_id"] == "RAW_WEATHERNEXT3"
    assert snap["model_status"] == "RAW_NWP_WEATHERNEXT3"
    assert snap["fallback"] is False
    assert snap["fallback_reason"] is None
    assert snap["ml_correction_applied"] is False
    assert snap["ml_correction_status"] == "NOT_APPLIED_INCOMPATIBLE_FEATURE_SCHEMA"
    assert snap["feature_schema"] is None

    # Verify rainfall semantics: accumulated mean
    assert math.isclose(snap["rainfall_mm"], 24.0, abs_tol=1e-3)
    assert snap["accumulation_hours"] == 24.0
    assert snap["distribution_type"] == DistributionType.ENSEMBLE_STATISTICS
    assert snap["statistics_quality"] == "MARGINAL_QUANTILE_ONLY"

    dist = snap["distribution"]
    assert dist is not None
    assert dist["type"] == "ENSEMBLE_STATISTICS"
    assert dist["statistics_quality"] == "MARGINAL_QUANTILE_ONLY"
    assert dist["p10_mm"] is None
    assert dist["p25_mm"] is None
    assert dist["p50_mm"] is None
    assert dist["p75_mm"] is None
    assert dist["p90_mm"] is None
    assert math.isclose(dist["mean_mm"], 24.0, abs_tol=1e-3)


def test_weathernext3_probability_unavailable(mock_wn3_fixture):
    """Verify /ml/probability returns probability_available=False for WeatherNext 3
    with sentinel probability=0.0 and UNAVAILABLE_NO_RAW_ENSEMBLE_WEATHERNEXT3.
    """
    resp_fc = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24,
        "provider": "weathernext3_statistics"
    })
    assert resp_fc.status_code == 200
    snap = resp_fc.json()

    resp_prob = client.post("/ml/probability", json=snap)
    assert resp_prob.status_code == 200
    prob_data = resp_prob.json()

    assert prob_data["probability_available"] is False
    assert prob_data["probability"] == 0.0  # Sentinel only
    assert prob_data["calibration_status"] == "UNAVAILABLE_NO_RAW_ENSEMBLE_WEATHERNEXT3"
    assert prob_data["ensemble_member_count"] == 0
    assert prob_data["ensemble_quality"] == "UNAVAILABLE"
    assert "not available in WeatherNext 3" in prob_data["fallback_status"]


def test_probability_sentinel_not_consumed_as_zero_risk(mock_wn3_fixture):
    """Verify downstream safety:
    When probability_available=False, the probability=0.0 sentinel:
    - MUST NOT be treated as a real 0% risk
    - MUST NOT downgrade rainfall intensity
    - Meteorological intensity is classified from rainfall alone
    - Status reflects COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE
    - Consequence models remain strictly FLOOD_MODEL_UNAVAILABLE
    """
    resp_fc = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24,
        "provider": "weathernext3_statistics"
    })
    snap = resp_fc.json()

    # WeatherNext predicted 24.0 mm (which is >= 15.6 mm threshold)
    # With probability_available=False and probability=0.0 sentinel:
    # If downstream improperly treated 0.0 as real probability, it would evaluate 0.0 < 0.5.
    # ImpactRequest factory must pass probability_available=False
    req = ImpactRequest.from_snapshot(
        snapshot=snap,
        event_probability=0.0,
        verification_status="NOT_VALIDATED",
        probability_available=False
    )
    assert req.probability_available is False

    hazard = get_impact(req)
    assert hazard.probability_available is False
    # Intensity must be evaluated from rainfall alone (24.0 mm >= 15.6 mm)
    assert hazard.meteorological_intensity.risk_level == "MODERATE"
    assert hazard.meteorological_intensity.status == "COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE"
    assert hazard.overall_hazard_level.status == "METEOROLOGICAL_SIGNAL_ONLY_PROBABILITY_UNAVAILABLE"
    assert hazard.flood_risk.risk_level == "UNKNOWN"
    assert hazard.flood_risk.status == "FLOOD_MODEL_UNAVAILABLE"
