import logging
from fastapi.testclient import TestClient
from ml.api.main import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smoke_test")

client = TestClient(app)

def test_forecast_integration_24h():
    logger.info("Testing +24h...")
    res_24 = client.post("/ml/forecast", json={
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_time": 24
    })
    
    assert res_24.status_code == 200, f"+24h failed: {res_24.text}"
    data_24 = res_24.json()
    assert data_24["model_status"] == "DEPLOY_CORRECTED", "24h real path should execute Residual ML bias correction"
    assert data_24["fallback"] is False, "24h real path should not fallback"
    assert data_24["fallback_reason"] is None
    assert data_24["model_id"] == "hazardguard_v7_24h"
    assert data_24["model_type"] == "Residual"
    assert isinstance(data_24["rainfall_mm"], (int, float)), "24h rainfall must be numeric"
    assert data_24["rainfall_mm"] >= 0.0
    assert data_24["snapshot_id"] is not None

def test_forecast_integration_48h():
    logger.info("Testing +48h...")
    res_48 = client.post("/ml/forecast", json={
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_time": 48
    })
    
    assert res_48.status_code == 200, f"+48h failed: {res_48.text}"
    data_48 = res_48.json()
    assert data_48["model_status"] == "FALLBACK_RAW_NWP", "48h should be FALLBACK_RAW_NWP"
    assert data_48["fallback"] is True, "48h fallback should be True"
    assert "skill gate" in data_48["fallback_reason"].lower() or "safety gate" in data_48["fallback_reason"].lower() or data_48["fallback_reason"] != "", "48h should have a fallback reason"
    assert isinstance(data_48["rainfall_mm"], (int, float)), "48h rainfall must be numeric"
    assert data_48["snapshot_id"] is not None
    assert data_48["model_type"] == "RAW"

def test_forecast_integration_72h():
    logger.info("Testing +72h...")
    res_72 = client.post("/ml/forecast", json={
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_time": 72
    })
    
    assert res_72.status_code == 200, f"+72h failed: {res_72.text}"
    data_72 = res_72.json()
    assert data_72["model_status"] == "FALLBACK_RAW_NWP"
    assert data_72["fallback"] is True
    assert data_72["model_type"] == "RAW"

def test_forecast_integration_failure():
    logger.info("Testing Failure Path (Out of Bounds Coordinates)...")
    res_fail = client.post("/ml/forecast", json={
        "latitude": 0.0,
        "longitude": 0.0,
        "lead_time": 24
    })
    
    assert res_fail.status_code == 404, f"Failure test failed. Got: {res_fail.status_code} {res_fail.text}"

