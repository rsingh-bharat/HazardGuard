import pytest
from fastapi.testclient import TestClient
from ml.api.main import app

client = TestClient(app)

def run_coherence_flow(lead_time: int, expected_model_type: str, expected_model_id: str):
    # 1. FORECAST
    res_forecast = client.post("/ml/forecast", json={
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_time": lead_time
    })
    assert res_forecast.status_code == 200, f"Forecast failed: {res_forecast.text}"
    snap = res_forecast.json()
    
    snapshot_id = snap["snapshot_id"]
    timestamp = snap["timestamp"]
    assert snap["lead_hours"] == lead_time
    assert snap["model_type"] == expected_model_type
    
    # 2. PROBABILITY
    res_prob = client.post("/ml/probability", json=snap)
    assert res_prob.status_code == 200, f"Probability failed: {res_prob.text}"
    prob_data = res_prob.json()
    
    assert prob_data["snapshot_id"] == snapshot_id
    assert prob_data["timestamp"] == timestamp
    assert prob_data["lead_hours"] == lead_time
    assert prob_data["calibration_status"] == "UNCALIBRATED_RAW_ENSEMBLE"
    assert prob_data["threshold_mm"] == 15.6
    assert 0.0 <= prob_data["probability"] <= 1.0
    
    # 3. VERIFICATION
    res_verif = client.post("/ml/verification", json=snap)
    assert res_verif.status_code == 200, f"Verification failed: {res_verif.text}"
    verif_data = res_verif.json()
    
    assert verif_data["snapshot_id"] == snapshot_id
    assert verif_data["timestamp"] == timestamp
    assert verif_data["lead_hours"] == lead_time
    assert verif_data["model_id"] == expected_model_id
    assert verif_data["baseline_model"] == "RAW_NWP"
    
    if snap["fallback"] and snap["model_type"] == "Residual":
        # Missing features caused fallback to RAW, but the intended model is Residual
        pass

    return snap, prob_data, verif_data

def test_coherence_24h():
    snap, prob, verif = run_coherence_flow(24, "Residual", "hazardguard_v7_24h")
    # For 24h, the target deployed model is Residual
    assert verif["RMSE"] is not None

def test_coherence_48h():
    snap, prob, verif = run_coherence_flow(48, "RAW", "hazardguard_v7_48h")
    assert verif["RMSE"] is not None

def test_coherence_72h():
    snap, prob, verif = run_coherence_flow(72, "RAW", "hazardguard_v7_72h")
    assert verif["RMSE"] is not None

def test_upstream_failure_propagation():
    # Force a failure in forecast
    res_forecast = client.post("/ml/forecast", json={
        "latitude": 0.0,
        "longitude": 0.0,
        "lead_time": 24
    })
    assert res_forecast.status_code == 404 # Not found / Out of bounds
    
    # We can't chain because there's no snapshot.
    # What if we pass a malformed snapshot directly to probability?
    res_prob = client.post("/ml/probability", json={"latitude": 0.0, "longitude": 0.0, "lead_time": 24})
    assert res_prob.status_code == 422
    
    res_verif = client.post("/ml/verification", json={"latitude": 0.0, "longitude": 0.0, "lead_time": 24})
    assert res_verif.status_code == 422

