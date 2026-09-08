"""Geographic scope validation tests for representative Indian climate regimes."""
import pytest
from fastapi.testclient import TestClient
from ml.api.main import app

client = TestClient(app)

REPRESENTATIVE_LOCATIONS = [
    {"name": "New Delhi (North)", "latitude": 28.6, "longitude": 77.2},
    {"name": "Mumbai (West)", "latitude": 19.0, "longitude": 72.8},
    {"name": "Bengaluru (South)", "latitude": 12.9, "longitude": 77.6},
]

@pytest.mark.parametrize("loc", REPRESENTATIVE_LOCATIONS, ids=lambda x: x["name"])
def test_representative_indian_coordinates_execute_24h_residual(loc):
    """Confirm the operational pipeline accepts diverse Indian climate regimes and executes 24h ML."""
    res = client.post("/ml/forecast", json={
        "latitude": loc["latitude"],
        "longitude": loc["longitude"],
        "lead_time": 24
    })
    assert res.status_code == 200, f"Failed for {loc['name']}: {res.text}"
    data = res.json()
    assert data["model_status"] == "DEPLOY_CORRECTED"
    assert data["fallback"] is False
    assert data["model_id"] == "hazardguard_v7_24h"
    assert data["model_type"] == "Residual"
    assert data["rainfall_mm"] >= 0.0

def test_non_meghalaya_chain_coherence():
    """Verify forecast -> probability -> verification chain for Western India (Mumbai)."""
    # 1. Forecast
    res_f = client.post("/ml/forecast", json={"latitude": 19.0, "longitude": 72.8, "lead_time": 24})
    assert res_f.status_code == 200
    snap = res_f.json()
    assert snap["model_status"] == "DEPLOY_CORRECTED"
    
    # 2. Probability
    res_p = client.post("/ml/probability", json=snap)
    assert res_p.status_code == 200
    prob = res_p.json()
    assert prob["snapshot_id"] == snap["snapshot_id"]
    assert prob["latitude"] == snap["latitude"]
    assert prob["longitude"] == snap["longitude"]
    assert prob["model_status"] == "DEPLOY_CORRECTED"
    assert prob["calibration_status"] == "UNCALIBRATED_RAW_ENSEMBLE"
    
    # 3. Verification
    res_v = client.post("/ml/verification", json=snap)
    assert res_v.status_code == 200
    verif = res_v.json()
    assert verif["snapshot_id"] == snap["snapshot_id"]
    assert verif["latitude"] == snap["latitude"]
    assert verif["longitude"] == snap["longitude"]
    assert verif["model_id"] == "hazardguard_v7_24h"
    assert verif["model_status"] == "DEPLOY_CORRECTED"
    assert verif["verification_status"] == "VERIFIED"
