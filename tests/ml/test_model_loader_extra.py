import os
import json
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock
from ml.model_loader import BiasCorrectorModel

@pytest.fixture
def test_setup(tmpdir):
    p = str(tmpdir.join("model_registry.json"))
    return p, tmpdir

def test_missing_artifact(test_setup):
    p, tmp = test_setup
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0, "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "Direct", "feature_schema": ["forecast_precip_mm"],
            "artifact_path": str(tmp.join("does_not_exist.json"))
        }], f)
    loader = BiasCorrectorModel(registry_path=p)
    df = pd.DataFrame({"forecast_precip_mm": [10.0]})
    res = loader.predict(24.0, df)
    assert res["status"] == "FALLBACK_RAW_NWP"
    assert "missing" in res["reason"] or "Model loaded failed" in res["reason"]

@patch("ml.model_loader.xgb.Booster")
def test_schema_validation(mock_xgb, test_setup):
    p, tmp = test_setup
    dummy_model = str(tmp.join("m.json"))
    with open(dummy_model, "w") as f: f.write("model")
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0, "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "Direct", "feature_schema": ["f1", "f2"],
            "artifact_path": dummy_model
        }], f)
    
    loader = BiasCorrectorModel(registry_path=p)
    loader._calculate_checksum = lambda x: None
    
    df = pd.DataFrame({"forecast_precip_mm": [10.0], "f1": [1.0]})
    res = loader.predict(24.0, df)
    assert res["status"] == "FALLBACK_RAW_NWP"
    assert "Missing features" in res["reason"]
    assert "f2" in res["reason"]

def test_checksum_failure(test_setup):
    p, tmp = test_setup
    dummy_model = str(tmp.join("m.json"))
    with open(dummy_model, "w") as f: f.write("model content")
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0, "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "Direct", "feature_schema": ["forecast_precip_mm"],
            "artifact_path": dummy_model, "artifact_checksum": "bad_checksum"
        }], f)
    loader = BiasCorrectorModel(registry_path=p)
    df = pd.DataFrame({"forecast_precip_mm": [10.0]})
    res = loader.predict(24.0, df)
    assert res["status"] == "FALLBACK_RAW_NWP"

def test_twostage_checksum_2_failure(test_setup):
    p, tmp = test_setup
    m1 = str(tmp.join("m1.json"))
    m2 = str(tmp.join("m2.json"))
    with open(m1, "w") as f: f.write("content1")
    with open(m2, "w") as f: f.write("content2")
    
    loader_ref = BiasCorrectorModel()
    real_c1 = loader_ref._calculate_checksum(m1)
    
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0, "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "TwoStage", "feature_schema": ["forecast_precip_mm"],
            "artifact_path": m1, "artifact_checksum": real_c1,
            "artifact_path_2": m2, "artifact_checksum_2": "bad_checksum2",
            "occurrence_threshold": 0.5
        }], f)
        
    loader = BiasCorrectorModel(registry_path=p)
    df = pd.DataFrame({"forecast_precip_mm": [10.0]})
    res = loader.predict(24.0, df)
    assert res["status"] == "FALLBACK_RAW_NWP"
