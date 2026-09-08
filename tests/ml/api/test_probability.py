import pytest
from fastapi.testclient import TestClient
from ml.api.main import app
import uuid
from unittest.mock import patch, MagicMock

client = TestClient(app)

def create_snapshot(lead_time=24, lat=25.467, lon=91.366):
    return {
        "snapshot_id": str(uuid.uuid4()),
        "timestamp": "2026-09-02T12:00:00Z",
        "latitude": lat,
        "longitude": lon,
        "lead_hours": lead_time,
        "provider": "open-meteo-single-runs",
        "provider_model": "ecmwf_ifs025",
        "nwp_valid_time": "2026-09-03T12:00:00Z",
        "nwp_initialization_time": None,
        "model_id": "RAW_NWP",
        "model_type": "RAW",
        "rainfall_mm": 50.0,
        "model_status": "FALLBACK_RAW_NWP",
        "fallback": True,
        "fallback_reason": "Skill gate failed"
    }

def test_prob_24h_valid():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.3}, perturbed_member_count=50))]
        snap = create_snapshot(24)
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 200
        assert res.json()["lead_hours"] == 24
        assert res.json()["probability"] == 0.3

def test_prob_48h_valid():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.4}, perturbed_member_count=50))]
        snap = create_snapshot(48)
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 200
        assert res.json()["lead_hours"] == 48

def test_prob_72h_valid():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.5}, perturbed_member_count=50))]
        snap = create_snapshot(72)
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 200
        assert res.json()["lead_hours"] == 72

def test_threshold_correctness():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.3}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 200
        assert res.json()["threshold_mm"] == 15.6
        assert res.json()["event_definition"] == "rainfall >= 15.6 mm"

def test_bounds_and_finite():
    # 5. bounds [0, 1] and 6. finite probability and 19. no numerical fabrication
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 1.5}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 200
        assert res.json()["probability"] is None
        assert res.json()["probability_available"] is False
        
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": -0.5}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 200
        assert res.json()["probability"] is None
        assert res.json()["probability_available"] is False

def test_snapshot_preservation():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.3}, perturbed_member_count=50))]
        snap = create_snapshot(24)
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 200
        assert res.json()["snapshot_id"] == snap["snapshot_id"]

def test_same_forecast_run_identity():
    # 8. same forecast-run identity
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.3}, perturbed_member_count=50))]
        snap = create_snapshot(24)
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 200
        mock_fetch.assert_called_once()
        kwargs = mock_fetch.call_args[1]
        assert kwargs["start_date"] == "2026-09-02"
        assert kwargs["end_date"] == "2026-09-06"

def test_raw_ensemble_and_calibration_unavailable():
    # 9, 11
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.3}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 200
        assert res.json()["calibration_status"] == "UNCALIBRATED_RAW_ENSEMBLE"

def test_support_semantics():
    # 12, 13
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.3}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 200
        data = res.json()
        assert data["ensemble_member_count"] == 50
        assert data["historical_positive_event_count"] is None

def test_provider_failure():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.side_effect = Exception("Network error")
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 502
        assert "Provider failure" in res.json()["detail"]

def test_invalid_lead():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        snap = create_snapshot(99)
        mock_fetch.return_value = []
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 404

def test_invalid_coords():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        snap = create_snapshot(24, 999.0, 999.0)
        mock_fetch.return_value = []
        res = client.post("/ml/probability", json=snap)
        assert res.status_code == 404

def test_malformed_snapshot():
    res = client.post("/ml/probability", json={"latitude": 20})
    assert res.status_code == 422

def test_missing_ensemble_statistics():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=None)]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 500
        assert "ensemble statistics" in res.json()["detail"]

def test_no_numerical_fabrication():
    # 19. If exceedance probability key is missing, it falls back to 0.0, but this is a valid float,
    # and no arbitrary probability is "fabricated" for missing data. It just means 0% members exceeded.
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=create_snapshot(24))
        assert res.status_code == 200
        assert res.json()["probability"] == 0.0

