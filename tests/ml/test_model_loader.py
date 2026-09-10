import os
import json
import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock
from ml.model_loader import BiasCorrectorModel

@pytest.fixture
def test_setup(tmpdir):
    p = str(tmpdir.join("model_registry.json"))
    return p, tmpdir

def test_unsupported_lead(test_setup):
    p, _ = test_setup
    with open(p, "w") as f:
        json.dump([], f)
    loader = BiasCorrectorModel(registry_path=p)
    df = pd.DataFrame({"forecast_precip_mm": [1.0]})
    res = loader.predict(999.0, df)
    assert res["status"] == "UNSUPPORTED_LEAD"
    assert res["predictions"] is None

def test_raw_fallback(test_setup):
    p, _ = test_setup
    with open(p, "w") as f:
        json.dump([{
            "lead": 48.0,
            "deployment_status": "FALLBACK_RAW_NWP",
            "model_type": "RAW",
            "fallback_reason": "ML failed skill gate",
            "feature_schema": ["forecast_precip_mm"],
            "target_transform": "RAW_NWP"
        }], f)
    loader = BiasCorrectorModel(registry_path=p)
    df = pd.DataFrame({"forecast_precip_mm": [5.5]})
    res = loader.predict(48.0, df)
    assert res["status"] == "FALLBACK_RAW_NWP"
    np.testing.assert_array_equal(res["predictions"], [5.5])
    assert "skill gate" in res["reason"]

@patch("ml.model_loader.xgb.Booster")
def test_residual_inverse_transform(mock_xgb, test_setup):
    p, tmp = test_setup
    dummy_model = str(tmp.join("m.json"))
    with open(dummy_model, "w") as f:
        f.write("model")
    
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0,
            "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "Residual",
            "feature_schema": ["forecast_precip_mm"],
            "target_transform": "Residual",
            "artifact_path": dummy_model,
        }], f)
    
    # Predict returns array([log_correction])
    m = MagicMock()
    m.predict.return_value = np.array([0.5])
    mock_xgb.return_value = m
    
    loader = BiasCorrectorModel(registry_path=p)
    # Exclude checksum check by overriding it
    loader._calculate_checksum = lambda x: None
    
    df = pd.DataFrame({"forecast_precip_mm": [10.0]})
    res = loader.predict(24.0, df)
    
    assert res["status"] == "DEPLOY_CORRECTED"
    # Residual calculation: expm1(raw_pred + log1p(raw_ecmwf))
    # log1p(10) = ~2.39789
    # 0.5 + 2.39789 = 2.89789
    # expm1(2.89789) = 17.1359
    expected = np.expm1(0.5 + np.log1p(10.0))
    np.testing.assert_allclose(res["predictions"], [expected], rtol=1e-5)

@patch("ml.model_loader.xgb.Booster")
def test_direct_inverse_transform(mock_xgb, test_setup):
    p, tmp = test_setup
    dummy_model = str(tmp.join("m.json"))
    with open(dummy_model, "w") as f: f.write("model")
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0, "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "Direct", "feature_schema": ["forecast_precip_mm"],
            "target_transform": "Direct", "artifact_path": dummy_model
        }], f)
    m = MagicMock()
    m.predict.return_value = np.array([2.5])
    mock_xgb.return_value = m
    loader = BiasCorrectorModel(registry_path=p)
    loader._calculate_checksum = lambda x: None
    df = pd.DataFrame({"forecast_precip_mm": [10.0]})
    res = loader.predict(24.0, df)
    expected = np.expm1(2.5)
    np.testing.assert_allclose(res["predictions"], [expected], rtol=1e-5)

@patch("ml.model_loader.xgb.Booster")
def test_twostage_inverse_transform(mock_xgb, test_setup):
    p, tmp = test_setup
    m1p = str(tmp.join("m1.json"))
    m2p = str(tmp.join("m2.json"))
    with open(m1p, "w") as f: f.write("model")
    with open(m2p, "w") as f: f.write("model")
    with open(p, "w") as f:
        json.dump([{
            "lead": 24.0, "deployment_status": "DEPLOY_CORRECTED",
            "model_type": "TwoStage", "feature_schema": ["forecast_precip_mm"],
            "target_transform": "TwoStage_Thresholded", 
            "artifact_path": m1p, "artifact_path_2": m2p, "occurrence_threshold": 0.4
        }], f)
    
    m1, m2 = MagicMock(), MagicMock()
    # probability = 0.5 (>= 0.4, so 1.0), amt_log = 2.0
    m1.predict.return_value = np.array([0.5, 0.3])
    m2.predict.return_value = np.array([2.0, 3.0])
    mock_xgb.side_effect = [m1, m2]
    
    loader = BiasCorrectorModel(registry_path=p)
    loader._calculate_checksum = lambda x: None
    df = pd.DataFrame({"forecast_precip_mm": [10.0, 10.0]})
    res = loader.predict(24.0, df)
    
    # Element 1: prob=0.5 >= 0.4 -> 1.0 * expm1(2.0)
    # Element 2: prob=0.3 < 0.4 -> 0.0 * expm1(3.0)
    expected = [np.expm1(2.0), 0.0]
    np.testing.assert_allclose(res["predictions"], expected, rtol=1e-5)
