import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Import the FastAPI app
from ml.api.main import app

client = TestClient(app)

def test_invalid_coordinates():
    response = client.post("/ml/forecast", json={
        "latitude": 100.0,  # Invalid, must be <= 90
        "longitude": 0.0,
        "lead_time": 24
    })
    assert response.status_code == 422
    assert "latitude" in response.text

    response = client.post("/ml/forecast", json={
        "latitude": 0.0,
        "longitude": 200.0, # Invalid, must be <= 180
        "lead_time": 24
    })
    assert response.status_code == 422
    assert "longitude" in response.text

def test_unsupported_lead():
    response = client.post("/ml/forecast", json={
        "latitude": 0.0,
        "longitude": 0.0,
        "lead_time": 36 # Unsupported
    })
    assert response.status_code == 422
    assert "lead time" in response.text.lower()

@patch("ml.api.main.provider.fetch_forecasts")
def test_provider_failure(mock_fetch):
    mock_fetch.side_effect = Exception("API down")
    response = client.post("/ml/forecast", json={
        "latitude": 0.0,
        "longitude": 0.0,
        "lead_time": 24
    })
    assert response.status_code == 502
    assert "Provider failure" in response.text

@patch("ml.api.main.provider.fetch_forecasts")
@patch("ml.api.main.loader.predict")
def test_model_loader_failure(mock_predict, mock_fetch):
    mock_fetch.return_value = [MagicMock()]
    mock_predict.side_effect = Exception("Corrupted model")
    
    with patch("ml.api.main.FeatureExtractor.extract_features") as mock_extract:
        mock_extract.return_value = {"forecastRainfallMm": 1.0}
        response = client.post("/ml/forecast", json={
            "latitude": 0.0,
            "longitude": 0.0,
            "lead_time": 24
        })
        
    assert response.status_code == 500
    assert "Model loader failure" in response.text

@patch("ml.api.main.provider.fetch_forecasts")
@patch("ml.api.main.loader.predict")
def test_valid_24h_request(mock_predict, mock_fetch):
    # Setup mocks
    mock_fetch.return_value = [MagicMock()]
    mock_predict.return_value = {
        "status": "DEPLOY_CORRECTED",
        "predictions": [15.5],
        "reason": "Successfully applied ML bias correction"
    }
    
    # Mock registry for 24h
    with patch.dict("ml.api.main.loader.registry", {24.0: {"model_id": "hg_24", "model_type": "Residual", "feature_schema": ["f1"]}}):
        with patch("ml.api.main.FeatureExtractor.extract_features") as mock_extract:
            mock_extract.return_value = {"f1": 1.0}
            
            response = client.post("/ml/forecast", json={
                "latitude": 28.6,
                "longitude": 77.2,
                "lead_time": 24
            })
            
            assert response.status_code == 200
            data = response.json()
            
            # 9. snapshot_id generation/preservation
            assert "snapshot_id" in data
            assert len(data["snapshot_id"]) > 0
            
            # 10. response schema validation (Pydantic model handled it, but let's check fields)
            assert data["latitude"] == 28.6
            assert data["lead_hours"] == 24
            assert data["rainfall_mm"] == 15.5
            assert data["model_status"] == "DEPLOY_CORRECTED"
            assert data["fallback"] is False
            assert data["fallback_reason"] is None
            assert data["model_type"] == "Residual"

@patch("ml.api.main.provider.fetch_forecasts")
@patch("ml.api.main.loader.predict")
def test_valid_48h_request_and_raw_fallback(mock_predict, mock_fetch):
    # Setup mocks
    mock_fetch.return_value = [MagicMock()]
    mock_predict.return_value = {
        "status": "FALLBACK_RAW_NWP",
        "predictions": [5.0],
        "reason": "Skill gate failed"
    }
    
    # 8. RAW fallback representation
    with patch.dict("ml.api.main.loader.registry", {48.0: {"model_id": "hg_48", "model_type": "RAW", "feature_schema": ["f1"]}}):
        with patch("ml.api.main.FeatureExtractor.extract_features") as mock_extract:
            mock_extract.return_value = {"f1": 1.0}
            
            response = client.post("/ml/forecast", json={
                "latitude": 28.6,
                "longitude": 77.2,
                "lead_time": 48
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["lead_hours"] == 48
            assert data["rainfall_mm"] == 5.0
            assert data["model_status"] == "FALLBACK_RAW_NWP"
            assert data["fallback"] is True
            assert data["fallback_reason"] == "Skill gate failed"
            assert data["model_type"] == "RAW"

@patch("ml.api.main.provider.fetch_forecasts")
@patch("ml.api.main.loader.predict")
def test_valid_72h_request(mock_predict, mock_fetch):
    # Setup mocks
    mock_fetch.return_value = [MagicMock()]
    mock_predict.return_value = {
        "status": "FALLBACK_RAW_NWP",
        "predictions": [2.0],
        "reason": "Skill gate failed"
    }
    
    with patch.dict("ml.api.main.loader.registry", {72.0: {"model_id": "hg_72", "model_type": "RAW", "feature_schema": ["f1"]}}):
        with patch("ml.api.main.FeatureExtractor.extract_features") as mock_extract:
            mock_extract.return_value = {"f1": 1.0}
            
            response = client.post("/ml/forecast", json={
                "latitude": 28.6,
                "longitude": 77.2,
                "lead_time": 72
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["lead_hours"] == 72
            assert data["rainfall_mm"] == 2.0
            assert data["model_status"] == "FALLBACK_RAW_NWP"
            assert data["fallback"] is True
            assert data["fallback_reason"] == "Skill gate failed"
            assert data["model_type"] == "RAW"
