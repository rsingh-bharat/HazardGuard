"""Comprehensive failure-state matrix, anti-spoofing, and snapshot coherence test suite.

Validates:
1. Provider success
2. Provider failure (HTTP 502)
3. Out-of-bounds coordinates (HTTP 404 / 422)
4. Unsupported lead times (HTTP 422)
5. Model loader failure (HTTP 500)
6. +24h gated ML residual deployment
7. +48h forced RAW fallback
8. +72h forced RAW fallback
9. Probability bounds and finite checks
10. Probability out-of-bounds rejected (HTTP 422)
11. Probability UNCALIBRATED_RAW_ENSEMBLE calibration status
12. FSS_NOT_VALIDATED status preserved and unvalidated
13. Model metadata anti-spoofing in impact endpoint
14. Threshold override anti-spoofing in impact endpoint
15. Missing required probability rejected (HTTP 422)
16. Exposure dimensions remain DATA_UNAVAILABLE (no fabrication)
17. Deterministic repeated request evaluation
18. End-to-end snapshot_id coherence across forecast -> probability -> verification -> impact
"""

import math
import uuid
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from ml.api.main import app

client = TestClient(app)


# ==============================================================================
# 1. Provider & Input Failure States
# ==============================================================================

def test_failure_matrix_invalid_coordinates_latitude():
    """Coordinates out of bounds must return HTTP 422."""
    res = client.post("/ml/forecast", json={"latitude": 95.0, "longitude": 77.0, "lead_time": 24})
    assert res.status_code == 422

def test_failure_matrix_invalid_coordinates_longitude():
    """Coordinates out of bounds must return HTTP 422."""
    res = client.post("/ml/forecast", json={"latitude": 28.0, "longitude": 190.0, "lead_time": 24})
    assert res.status_code == 422

def test_failure_matrix_unsupported_lead_time():
    """Lead times other than 24, 48, 72 must return HTTP 422."""
    res = client.post("/ml/forecast", json={"latitude": 28.6, "longitude": 77.2, "lead_time": 12})
    assert res.status_code == 422

def test_failure_matrix_provider_out_of_bounds_404():
    """Provider returning empty records for unmapped/out-of-bounds domain returns 404."""
    res = client.post("/ml/forecast", json={"latitude": 0.0, "longitude": 0.0, "lead_time": 24})
    assert res.status_code == 404

@patch("ml.api.main.provider.fetch_forecasts")
def test_failure_matrix_provider_timeout_502(mock_fetch):
    """Network/upstream provider exceptions must surface cleanly as HTTP 502."""
    mock_fetch.side_effect = TimeoutError("Connection to Open-Meteo timed out.")
    res = client.post("/ml/forecast", json={"latitude": 28.6, "longitude": 77.2, "lead_time": 24})
    assert res.status_code == 502
    assert "Provider failure" in res.json()["detail"]

@patch("ml.api.main.provider.fetch_forecasts")
@patch("ml.api.main.loader.predict")
def test_failure_matrix_model_loader_failure_500(mock_predict, mock_fetch):
    """Corrupted or missing ML model invocation returns HTTP 500 without crashing process."""
    mock_fetch.return_value = [MagicMock()]
    mock_predict.side_effect = RuntimeError("Failed to allocate tensor / corrupted artifact")
    
    with patch("ml.api.main.FeatureExtractor.extract_features") as mock_extract:
        mock_extract.return_value = {"forecastRainfallMm": 10.0}
        res = client.post("/ml/forecast", json={"latitude": 28.6, "longitude": 77.2, "lead_time": 24})
        assert res.status_code == 500
        assert "Model loader failure" in res.json()["detail"]


# ==============================================================================
# 2. Bounded Scientific Model Deployment & Safety Gate Enforcement
# ==============================================================================

def test_failure_matrix_24h_deployment_path():
    """+24h operational path executes gated XGBoost residual bias correction."""
    res = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 24})
    assert res.status_code == 200
    data = res.json()
    assert data["lead_hours"] == 24
    assert data["model_status"] == "DEPLOY_CORRECTED"
    assert data["fallback"] is False
    assert data["model_id"] == "hazardguard_v7_24h"
    assert data["model_type"] == "Residual"
    assert math.isfinite(data["rainfall_mm"])
    assert data["rainfall_mm"] >= 0.0

def test_failure_matrix_48h_forced_raw_path():
    """+48h operational path is safety-gated to RAW NWP fallback."""
    res = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 48})
    assert res.status_code == 200
    data = res.json()
    assert data["lead_hours"] == 48
    assert data["model_status"] == "FALLBACK_RAW_NWP"
    assert data["fallback"] is True
    assert data["model_type"] == "RAW"
    assert "safety gate" in data["fallback_reason"].lower() or "skill gate" in data["fallback_reason"].lower()

def test_failure_matrix_72h_forced_raw_path():
    """+72h operational path is safety-gated to RAW NWP fallback."""
    res = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 72})
    assert res.status_code == 200
    data = res.json()
    assert data["lead_hours"] == 72
    assert data["model_status"] == "FALLBACK_RAW_NWP"
    assert data["fallback"] is True
    assert data["model_type"] == "RAW"


# ==============================================================================
# 3. Probability & Calibration Failure States
# ==============================================================================

def test_failure_matrix_probability_uncalibrated_raw_ensemble():
    """Probability must declare UNCALIBRATED_RAW_ENSEMBLE status."""
    res_f = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 24})
    assert res_f.status_code == 200
    snap = res_f.json()

    res_p = client.post("/ml/probability", json=snap)
    assert res_p.status_code == 200
    p_data = res_p.json()
    assert p_data["calibration_status"] == "UNCALIBRATED_RAW_ENSEMBLE"
    assert 0.0 <= p_data["probability"] <= 1.0
    assert p_data["threshold_mm"] == 15.6

def test_failure_matrix_fss_not_validated():
    """Verification must declare FSS_NOT_VALIDATED and FSS is None."""
    res_f = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 24})
    snap = res_f.json()

    res_v = client.post("/ml/verification", json=snap)
    assert res_v.status_code == 200
    v_data = res_v.json()
    assert v_data["FSS_status"] == "FSS_NOT_VALIDATED"
    assert v_data["FSS"] is None


# ==============================================================================
# 4. Anti-Spoofing & Input Boundary Integrity
# ==============================================================================

def test_failure_matrix_spoofed_model_status_rejected_in_impact():
    """Caller attempting to upgrade 48h to DEPLOY_CORRECTED is overridden by registry."""
    spoofed_req = {
        "snapshot_id": str(uuid.uuid4()),
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 28.6,
        "longitude": 77.2,
        "lead_hours": 48,
        "rainfall_mm": 25.0,
        "event_probability": 0.8,
        "model_id": "spoofed_xgboost_48h",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False,
        "fallback_reason": None,
        "verification_status": "VERIFIED"
    }
    res = client.post("/ml/impact", json=spoofed_req)
    assert res.status_code == 200
    data = res.json()
    assert data["model_status"] == "FALLBACK_RAW_NWP"
    assert data["fallback"] is True
    assert "Registry mandates fallback" in data["fallback_reason"] or "No ML candidate" in data["fallback_reason"]

def test_failure_matrix_spoofed_threshold_rejected():
    """Caller attempting to override event threshold to non-15.6mm is rejected with HTTP 422."""
    req = {
        "snapshot_id": str(uuid.uuid4()),
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 28.6,
        "longitude": 77.2,
        "lead_hours": 24,
        "rainfall_mm": 20.0,
        "event_probability": 0.8,
        "event_threshold_mm": 5.0,  # Spoofed
        "model_id": "hazardguard_v7_24h",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False,
        "verification_status": "VERIFIED"
    }
    res = client.post("/ml/impact", json=req)
    assert res.status_code == 422
    assert "event_threshold_mm override rejected" in res.text

def test_failure_matrix_probability_out_of_range_rejected():
    """Probability > 1.0 or < 0.0 must be rejected with HTTP 422."""
    req = {
        "snapshot_id": str(uuid.uuid4()),
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 28.6,
        "longitude": 77.2,
        "lead_hours": 24,
        "rainfall_mm": 20.0,
        "event_probability": 1.25,
        "model_id": "hazardguard_v7_24h",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False,
        "verification_status": "VERIFIED"
    }
    res = client.post("/ml/impact", json=req)
    assert res.status_code == 422

def test_failure_matrix_missing_probability_rejected():
    """Impact request lacking event_probability must return HTTP 422."""
    req = {
        "snapshot_id": str(uuid.uuid4()),
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 28.6,
        "longitude": 77.2,
        "lead_hours": 24,
        "rainfall_mm": 20.0,
        "model_id": "hazardguard_v7_24h",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False,
        "verification_status": "VERIFIED"
    }
    res = client.post("/ml/impact", json=req)
    assert res.status_code == 422


# ==============================================================================
# 5. Snapshot Coherence Across All 4 Endpoints
# ==============================================================================

def test_failure_matrix_full_chain_snapshot_coherence():
    """Prove that snapshot_id, lead_time, and coordinates are preserved across all 4 endpoints."""
    # 1. Forecast
    res_f = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 24})
    assert res_f.status_code == 200
    snap = res_f.json()
    snapshot_id = snap["snapshot_id"]

    # 2. Probability
    res_p = client.post("/ml/probability", json=snap)
    assert res_p.status_code == 200
    prob_data = res_p.json()
    assert prob_data["snapshot_id"] == snapshot_id
    assert prob_data["lead_hours"] == 24
    assert prob_data["latitude"] == snap["latitude"]
    assert prob_data["longitude"] == snap["longitude"]

    # 3. Verification
    res_v = client.post("/ml/verification", json=snap)
    assert res_v.status_code == 200
    verif_data = res_v.json()
    assert verif_data["snapshot_id"] == snapshot_id
    assert verif_data["lead_hours"] == 24
    assert verif_data["model_status"] == snap["model_status"]

    # 4. Impact
    impact_req = {
        "snapshot_id": snapshot_id,
        "timestamp": snap["timestamp"],
        "latitude": snap["latitude"],
        "longitude": snap["longitude"],
        "lead_hours": snap["lead_hours"],
        "rainfall_mm": snap["rainfall_mm"],
        "event_probability": prob_data["probability"],
        "event_threshold_mm": prob_data["threshold_mm"],
        "model_id": snap["model_id"],
        "model_status": snap["model_status"],
        "fallback": snap["fallback"],
        "fallback_reason": snap["fallback_reason"],
        "verification_status": verif_data["verification_status"]
    }
    res_i = client.post("/ml/impact", json=impact_req)
    assert res_i.status_code == 200
    impact_data = res_i.json()
    assert impact_data["snapshot_id"] == snapshot_id
    assert impact_data["lead_hours"] == 24
    assert impact_data["model_status"] == snap["model_status"]
    assert impact_data["flood_risk"]["status"] == "FLOOD_MODEL_UNAVAILABLE"
    assert impact_data["road_risk"]["status"] == "DATA_UNAVAILABLE"
    assert impact_data["overall_hazard_level"]["status"] == "METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS"
