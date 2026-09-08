import pytest
from fastapi.testclient import TestClient
from ml.api.main import app
import uuid
import datetime

client = TestClient(app)

def create_base_request():
    return {
        "snapshot_id": str(uuid.uuid4()),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "latitude": 28.6,
        "longitude": 77.2,
        "lead_hours": 24,
        "rainfall_mm": 20.0,
        "event_probability": 0.8,
        "event_threshold_mm": 15.6,
        "model_id": "hazardguard_v7_24h",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False,
        "fallback_reason": None,
        "verification_status": "VERIFIED"
    }

def test_impact_high_rainfall_meteorological_intensity():
    # 1. high rainfall -> meteorological_intensity HIGH
    req = create_base_request()
    req["rainfall_mm"] = 30.0
    req["event_probability"] = 0.9
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["meteorological_intensity"]["risk_level"] == "HIGH"
    assert data["meteorological_intensity"]["status"] == "COMPUTED_METEOROLOGICAL_ONLY"
    assert data["overall_hazard_level"]["risk_level"] == "HIGH"
    assert data["overall_hazard_level"]["status"] == "METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS"

def test_impact_moderate_rainfall_meteorological_intensity():
    # 2. moderate rainfall -> meteorological_intensity MODERATE
    req = create_base_request()
    req["rainfall_mm"] = 20.0
    req["event_probability"] = 0.4
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["meteorological_intensity"]["risk_level"] == "MODERATE"
    assert data["meteorological_intensity"]["status"] == "COMPUTED_METEOROLOGICAL_ONLY"
    assert data["overall_hazard_level"]["risk_level"] == "MODERATE"
    assert data["overall_hazard_level"]["status"] == "METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS"

def test_impact_low_rainfall_meteorological_intensity():
    # 3. low rainfall -> meteorological_intensity LOW
    req = create_base_request()
    req["rainfall_mm"] = 5.0
    req["event_probability"] = 0.1
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["meteorological_intensity"]["risk_level"] == "LOW"
    assert data["meteorological_intensity"]["status"] == "COMPUTED_METEOROLOGICAL_ONLY"
    assert data["overall_hazard_level"]["risk_level"] == "LOW"
    assert data["overall_hazard_level"]["status"] == "METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS"

def test_impact_flood_risk_remains_unknown():
    # 4. flood risk remains UNKNOWN without flood model
    req = create_base_request()
    req["rainfall_mm"] = 50.0
    req["event_probability"] = 0.99
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["flood_risk"]["risk_level"] == "UNKNOWN"
    assert data["flood_risk"]["status"] == "FLOOD_MODEL_UNAVAILABLE"


def test_impact_overall_hazard_explicitly_meteorological_only():
    # 6. overall hazard explicitly marked meteorological-only
    req = create_base_request()
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["overall_hazard_level"]["status"] == "METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS"

def test_impact_event_threshold_spoofing_rejected():
    # 7. event threshold spoofing rejected
    req = create_base_request()
    req["event_threshold_mm"] = 0.1
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 422
    assert "event_threshold_mm" in response.text or "override rejected" in response.text

def test_impact_probability_greater_than_one_rejected():
    # 8. probability > 1 rejected
    req = create_base_request()
    req["event_probability"] = 1.05
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 422

def test_impact_probability_less_than_zero_rejected():
    # 9. probability < 0 rejected
    req = create_base_request()
    req["event_probability"] = -0.05
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 422

def test_impact_spoofed_48h_deploy_corrected_cannot_override_registry():
    # 10. spoofed 48h DEPLOY_CORRECTED status cannot override registry
    req = create_base_request()
    req["lead_hours"] = 48
    req["model_id"] = "spoofed_model_48"
    req["model_status"] = "DEPLOY_CORRECTED"
    req["fallback"] = False
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["model_status"] == "FALLBACK_RAW_NWP"
    assert data["fallback"] is True
    assert "Registry mandates fallback" in data["fallback_reason"] or "No ML candidate" in data["fallback_reason"]

def test_impact_spoofed_72h_deploy_corrected_cannot_override_registry():
    # 11. spoofed 72h DEPLOY_CORRECTED status cannot override registry
    req = create_base_request()
    req["lead_hours"] = 72
    req["model_id"] = "spoofed_model_72"
    req["model_status"] = "DEPLOY_CORRECTED"
    req["fallback"] = False
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["model_status"] == "FALLBACK_RAW_NWP"
    assert data["fallback"] is True
    assert "Registry mandates fallback" in data["fallback_reason"] or "No ML candidate" in data["fallback_reason"]

def test_impact_missing_probability_rejected():
    # 12. missing probability rejected
    req = create_base_request()
    del req["event_probability"]
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 422

def test_impact_snapshot_id_preservation():
    # 13. snapshot_id preserved
    req = create_base_request()
    snap_id = req["snapshot_id"]
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["snapshot_id"] == snap_id

def test_impact_deterministic_repeated_evaluation():
    # 14. deterministic repeated evaluation
    req = create_base_request()
    response1 = client.post("/ml/impact", json=req)
    response2 = client.post("/ml/impact", json=req)
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert response1.json() == response2.json()

def test_impact_existing_exposure_dimensions_remain_data_unavailable():
    # 15. existing exposure dimensions remain DATA_UNAVAILABLE
    req = create_base_request()
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["road_risk"]["risk_level"] == "UNKNOWN"
    assert data["road_risk"]["status"] == "DATA_UNAVAILABLE"
    assert data["infrastructure_risk"]["risk_level"] == "UNKNOWN"
    assert data["infrastructure_risk"]["status"] == "DATA_UNAVAILABLE"
    assert data["population_risk"]["risk_level"] == "UNKNOWN"
    assert data["population_risk"]["status"] == "DATA_UNAVAILABLE"

def test_impact_24h_valid_metadata_preserved():
    req = create_base_request()
    req["lead_hours"] = 24
    req["model_status"] = "DEPLOY_CORRECTED"
    req["fallback"] = False
    
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["lead_hours"] == 24
    assert data["model_status"] == "DEPLOY_CORRECTED"
    assert data["fallback"] is False

def test_impact_fss_not_validated_rejected_as_verification_status():
    """FSS status is distinct from verification_status; FSS_NOT_VALIDATED must be rejected as verification_status."""
    req = create_base_request()
    req["verification_status"] = "FSS_NOT_VALIDATED"
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 422
    assert "verification_status" in response.text

def test_impact_not_validated_status_accepted():
    """NOT_VALIDATED is an accepted verification_status."""
    req = create_base_request()
    req["verification_status"] = "NOT_VALIDATED"
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["verification_status"] == "NOT_VALIDATED"

def test_impact_default_event_threshold_mm_applied_when_omitted():
    req = create_base_request()
    del req["event_threshold_mm"]
    response = client.post("/ml/impact", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["event_threshold_mm"] == 15.6
