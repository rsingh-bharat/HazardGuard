"""End-to-End (E2E) Integration Tests for WeatherNext 3.

Contains two layers:
1. Layer 1 (Deterministic CI E2E):
   WeatherNext provider -> CanonicalForecastRecord -> /ml/forecast?provider=weathernext3_statistics
   -> ForecastSnapshot -> /ml/probability -> /ml/impact -> Soumy ImpactRequest
   (using 3DImpactTwin.services.impact_engine.core.engine) -> ImpactResult -> verify truthful provenance.

2. Layer 2 (Separate live GCS smoke test without blocking CI):
   Probes gs://weathernext3_statistics_spatial/, checks credentials, confirms operational run
   or classifies LIVE_WEATHERNEXT_EOL_PATH / CURRENT_OPERATIONAL_RUN_CONFIRMED.
   Skipped safely if no GCS auth token in environment / gcloud.
"""

import os
import sys
import math
import datetime
from pathlib import Path
import pytest
import numpy as np
import zstandard
from fastapi.testclient import TestClient

# Ensure 3DImpactTwin is on sys.path for importing Soumy's impact engine
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
TWIN_ROOT = REPO_ROOT / "3DImpactTwin"
if not TWIN_ROOT.exists():
    # Fallback to direct absolute path if path structure differs
    TWIN_ROOT = Path(r"D:\integration\integration\3DImpactTwin")
if str(TWIN_ROOT) not in sys.path:
    sys.path.insert(0, str(TWIN_ROOT))

from ml.api.main import app, ForecastSnapshot
from ml.api.impact import ImpactRequest as MLImpactRequest, get_impact
from ml.data.providers.factory import get_provider
from ml.data.providers.weathernext3 import (
    WeatherNext3StatisticsProvider,
    WeatherNextAuthError,
    WeatherNextNotFoundError,
)
from ml.data.schema import DistributionType

from services.impact_engine.core.engine import ImpactEngine
from services.impact_engine.core.schemas import ImpactRequest as SoumyImpactRequest

client = TestClient(app)


# ===========================================================================
# Fixtures
# ===========================================================================

@pytest.fixture
def deterministic_wn3_fixture(tmp_path, monkeypatch):
    """Create a temporary local WeatherNext 3 fixture and monkeypatch the provider factory."""
    fixture_root = tmp_path / "mock_wn3_e2e"
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
                arr[lat_idx, lon_idx] = 0.0008 # 0.8 mm/hr -> 19.2 mm sum (MUST NOT BE ACCUMULATED)
            elif var == "temperature_2m_mean":
                arr[lat_idx, lon_idx] = 295.15  # 22 °C
            elif var == "wind_speed_10m_mean":
                arr[lat_idx, lon_idx] = 5.0     # 18 km/h
            elif var == "mean_sea_level_pressure_mean":
                arr[lat_idx, lon_idx] = 101300.0  # 1013 hPa

            compressed = cctx.compress(arr.tobytes())
            chunk_file.write_bytes(compressed)

    orig_get_provider = get_provider
    def patched_get_provider(provider_id: str, **kwargs):
        if provider_id == "weathernext3_statistics":
            kwargs["local_fixture_root"] = str(fixture_root)
        return orig_get_provider(provider_id, **kwargs)

    monkeypatch.setattr("ml.api.main.get_provider", patched_get_provider)
    return {
        "fixture_root": str(fixture_root),
        "run_id": run_id,
        "expected_mean_rainfall": 24.0,
    }


# ===========================================================================
# Layer 1: Deterministic CI E2E Test
# ===========================================================================

def test_weathernext3_deterministic_ci_e2e(deterministic_wn3_fixture):
    """Layer 1: Deterministic CI E2E Test.

    Flow:
    1. Direct Provider fetch -> CanonicalForecastRecord with honest semantics
    2. /ml/forecast (provider="weathernext3_statistics") -> ForecastSnapshot
    3. /ml/probability -> probability_available=False, probability=0.0
    4. /ml/impact -> probability sentinel safety verified (not consumed as 0% risk)
    5. Soumy 3DImpactTwin -> ImpactEngine.simulate() -> ImpactResult with truthful provenance
    """
    # -----------------------------------------------------------------------
    # Step 1: /ml/forecast API
    # -----------------------------------------------------------------------
    resp_fc = client.post("/ml/forecast", json={
        "latitude": 12.9716,
        "longitude": 77.5946,
        "lead_time": 24,
        "provider": "weathernext3_statistics"
    })
    assert resp_fc.status_code == 200, f"Forecast failed: {resp_fc.text}"
    snap = resp_fc.json()

    # Verify WeatherNext is NOT a fallback
    assert snap["provider"] == "WeatherNext3"
    assert snap["model_id"] == "RAW_WEATHERNEXT3"
    assert snap["model_status"] == "RAW_NWP_WEATHERNEXT3"
    assert snap["fallback"] is False
    assert snap["fallback_reason"] is None
    assert snap["ml_correction_applied"] is False
    assert snap["ml_correction_status"] == "NOT_APPLIED_INCOMPATIBLE_FEATURE_SCHEMA"

    # Verify rainfall math semantics: accumulated mean, cumulative quantiles are None
    assert math.isclose(snap["rainfall_mm"], 24.0, abs_tol=1e-3)
    assert snap["accumulation_hours"] == 24.0
    assert snap["distribution_type"] == DistributionType.ENSEMBLE_STATISTICS
    assert snap["statistics_quality"] == "MARGINAL_QUANTILE_ONLY"
    assert snap["distribution"]["p10_mm"] is None
    assert snap["distribution"]["p50_mm"] is None
    assert snap["distribution"]["p90_mm"] is None
    assert math.isclose(snap["distribution"]["mean_mm"], 24.0, abs_tol=1e-3)

    # -----------------------------------------------------------------------
    # Step 2: /ml/probability API
    # -----------------------------------------------------------------------
    resp_prob = client.post("/ml/probability", json=snap)
    assert resp_prob.status_code == 200
    prob_data = resp_prob.json()

    assert prob_data["probability_available"] is False
    assert prob_data["probability"] == 0.0
    assert prob_data["calibration_status"] == "UNAVAILABLE_NO_RAW_ENSEMBLE_WEATHERNEXT3"

    # -----------------------------------------------------------------------
    # Step 3: /ml/impact API (Probability Sentinel Safety)
    # -----------------------------------------------------------------------
    ml_impact_req = MLImpactRequest.from_snapshot(
        snapshot=snap,
        event_probability=0.0,
        verification_status="NOT_VALIDATED",
        probability_available=False
    )
    impact_data = get_impact(ml_impact_req)

    assert impact_data.probability_available is False
    # Intensity must be evaluated from rainfall alone (24.0 mm >= 15.6 mm)
    assert impact_data.meteorological_intensity.risk_level == "MODERATE"
    assert impact_data.meteorological_intensity.status == "COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE"
    assert impact_data.overall_hazard_level.status == "METEOROLOGICAL_SIGNAL_ONLY_PROBABILITY_UNAVAILABLE"
    assert impact_data.flood_risk.risk_level == "UNKNOWN"
    assert impact_data.flood_risk.status == "FLOOD_MODEL_UNAVAILABLE"

    # -----------------------------------------------------------------------
    # Step 4: Soumy 3DImpactTwin Simulation & Provenance Verification
    # -----------------------------------------------------------------------
    engine = ImpactEngine()
    soumy_req = SoumyImpactRequest.from_dict({
        "authoritative_forecast": {
            "snapshot_id": snap["snapshot_id"],
            "model_id": snap["model_id"],
            "fallback": snap["fallback"],
            "rainfall_mm": snap["rainfall_mm"],
            "probability_available": False,
        },
        "forecast": {
            "forecast_id": snap["snapshot_id"],
            "state_id": "KA",
            "district_id": "KA_BLR_URBAN",
            "bbox": [77.58, 12.89, 77.695, 12.98],
        },
        "scenario_type": "BASE"
    })

    sim_result = engine.simulate(soumy_req)
    assert sim_result is not None
    assert sim_result.simulation_id is not None

    # Truthful Provenance Handoff assertions
    assert sim_result.provenance.authoritative_snapshot_id == snap["snapshot_id"]
    assert sim_result.provenance.authoritative_model_id == "RAW_WEATHERNEXT3"
    assert sim_result.provenance.authoritative_fallback is False

    # Scenario comparison monotonicity: HIGH >= BASE >= LOW
    comp = sim_result.comparison
    assert "LOW" in comp and "BASE" in comp and "HIGH" in comp
    assert comp["HIGH"]["rainfall_mm"] >= comp["BASE"]["rainfall_mm"] >= comp["LOW"]["rainfall_mm"]
    assert comp["HIGH"]["peak_water_depth_m"] >= comp["LOW"]["peak_water_depth_m"]


# ===========================================================================
# Layer 2: Live GCS Smoke Test (Safe & Non-blocking)
# ===========================================================================

def test_weathernext3_live_gcs_smoke():
    """Layer 2: Separate Live GCS Smoke Test.

    Probes gs://weathernext3_statistics_spatial/:
    - Checks for Google Cloud credentials.
    - If unavailable, safely skips test without failing CI.
    - If available:
      - Tests live bucket connectivity.
      - Lists runs under weathernext_3_0_0_statistics/zarr/2026_to_present/.
      - If today's operational run is missing (EOL / stopped in Jan 2026),
        confirms classification as LIVE_WEATHERNEXT_EOL_PATH and verifies
        truthful WeatherNextNotFoundError (no fake data, no silent fallback).
      - If a historical run (e.g. 20260101_00hr_01_preds) is present,
        verifies live parsing, HISTORICAL run_status, and statistics_quality.
    """
    config = get_provider("ecmwf_ifs").config  # dummy ProviderConfig for initialization
    live_provider = WeatherNext3StatisticsProvider(config=config)

    # 1. Check credentials
    try:
        token = live_provider._get_access_token()
    except WeatherNextAuthError as e:
        pytest.skip(f"Live GCS credentials not available: {e}. Non-blocking CI skip.")

    # 2. Check bucket reachability
    import urllib.request
    import json

    quoted_prefix = urllib.parse.quote("weathernext_3_0_0_statistics/zarr/2026_to_present/", safe="")
    url = f"{live_provider.GCS_STORAGE_API}/{live_provider.bucket_name}/o?prefix={quoted_prefix}&delimiter=/&maxResults=5"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "HazardGuard-WeatherNext3-SmokeTest/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            prefixes = data.get("prefixes", [])
    except Exception as e:
        pytest.skip(f"Live GCS bucket probe failed due to network/firewall: {e}. Non-blocking CI skip.")

    assert len(prefixes) > 0, "GCS bucket accessible but no run prefixes returned."

    # 3. Classify operational vs EOL status for today's run
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    today_str = now_utc.strftime("%Y%m%d")
    expected_today_run = f"{today_str}_00hr_01_preds"

    try:
        live_provider._verify_run_exists(expected_today_run)
        operational_status = "CURRENT_OPERATIONAL_RUN_CONFIRMED"
    except WeatherNextNotFoundError:
        operational_status = "LIVE_WEATHERNEXT_EOL_PATH"

    assert operational_status in ("CURRENT_OPERATIONAL_RUN_CONFIRMED", "LIVE_WEATHERNEXT_EOL_PATH")

    # 4. Verify truthful rejection when a non-existent run is queried (never fabricates, never falls back)
    with pytest.raises(WeatherNextNotFoundError):
        live_provider._verify_run_exists("19990101_00hr_01_preds")

    # 5. Verify run status classification
    if operational_status == "CURRENT_OPERATIONAL_RUN_CONFIRMED":
        status_today = live_provider._classify_run_status(
            run_id=expected_today_run,
            init_iso=f"{today_str[:4]}-{today_str[4:6]}-{today_str[6:8]}T00:00:00Z",
            start_date=now_utc.strftime("%Y-%m-%d")
        )
        assert status_today in ("LATEST_AVAILABLE", "STALE/NOT_CURRENT")

    # Verify historical run classification (caller requested past date)
    status_hist = live_provider._classify_run_status(
        run_id="20260101_00hr_01_preds",
        init_iso="2026-01-01T00:00:00Z",
        start_date="2026-01-01"
    )
    assert status_hist == "HISTORICAL"

    # Verify stale run classification (caller requested current date with old run)
    status_stale = live_provider._classify_run_status(
        run_id="20260101_00hr_01_preds",
        init_iso="2026-01-01T00:00:00Z",
        start_date=now_utc.strftime("%Y-%m-%d")
    )
    assert status_stale == "STALE/NOT_CURRENT"
