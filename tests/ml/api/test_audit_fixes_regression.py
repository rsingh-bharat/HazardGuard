"""Regression tests for surgical fixes from adversarial audit."""
import math
import os
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
import xgboost as xgb

from ml.api.main import app, get_registry_metrics, REGISTRY_PATH
from ml.data.schema import CanonicalForecastRecord, EnsembleStats
from ml.data.weathernext_ingest import compute_ensemble_stats
from ml.features.extractor import FeatureExtractor
from ml.model_loader import BiasCorrectorModel

client = TestClient(app)

def test_timestamp_no_undefined_snapshot_reference():
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_rec = CanonicalForecastRecord(
            source="ECMWF",
            dataset_version="1.0",
            valid_time="2026-09-03T00:00:00Z",
            ingestion_time="2026-09-03T00:00:00Z",
            latitude=25.467,
            longitude=91.366,
            grid_id="grid_25.4670_91.3660",
            forecast_rainfall_mm=10.0
        )
        mock_fetch.return_value = [mock_rec]
        
        response = client.post("/ml/forecast", json={
            "latitude": 25.467,
            "longitude": 91.366,
            "lead_time": 24
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        assert "T" in data["timestamp"]
        kwargs = mock_fetch.call_args[1]
        assert len(kwargs["start_date"]) == 10
        assert len(kwargs["end_date"]) == 10

def test_24h_feature_schema_matches_trained_artifact():
    booster = xgb.Booster()
    artifact_path = Path(__file__).resolve().parent.parent.parent.parent / "ml" / "models" / "candidates" / "24h_residual.json"
    booster.load_model(str(artifact_path))
    
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)
        
    entry_24 = next(e for e in registry if float(e["lead"]) == 24.0)
    registry_schema = entry_24["feature_schema"]
    
    assert booster.feature_names == registry_schema
    assert "forecast_cloud_cover" in booster.feature_names
    assert booster.feature_names[6] == "forecast_cloud_cover"

def test_24h_residual_executes_with_valid_atmospheric_inputs():
    full_record = CanonicalForecastRecord(
        source="ECMWF",
        dataset_version="1.0",
        valid_time="2026-09-03T00:00:00Z",
        ingestion_time="2026-09-03T00:00:00Z",
        latitude=25.467,
        longitude=91.366,
        grid_id="grid_25.4670_91.3660",
        forecast_rainfall_mm=20.0,
        temperature_celsius=24.0,
        relative_humidity_percent=85.0,
        surface_pressure_hpa=1005.0,
        wind_speed_kmh=12.0,
        wind_direction_deg=190.0,
        cloud_cover_percent=70.0
    )
    
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [full_record]
        
        response = client.post("/ml/forecast", json={
            "latitude": 25.467,
            "longitude": 91.366,
            "lead_time": 24
        })
        
        assert response.status_code == 200
        snap = response.json()
        assert snap["model_status"] == "DEPLOY_CORRECTED"
        assert snap["fallback"] is False
        assert snap["fallback_reason"] is None
        assert snap["model_type"] == "Residual"
        assert snap["model_id"] == "hazardguard_v7_24h"
        assert math.isfinite(snap["rainfall_mm"])
        assert snap["rainfall_mm"] >= 0.0

def test_no_cloud_cover_fabrication_triggers_safe_fallback():
    missing_cc_record = CanonicalForecastRecord(
        source="ECMWF",
        dataset_version="1.0",
        valid_time="2026-09-03T00:00:00Z",
        ingestion_time="2026-09-03T00:00:00Z",
        latitude=25.467,
        longitude=91.366,
        grid_id="grid_25.4670_91.3660",
        forecast_rainfall_mm=20.0,
        temperature_celsius=24.0,
        relative_humidity_percent=85.0,
        surface_pressure_hpa=1005.0,
        wind_speed_kmh=12.0,
        wind_direction_deg=190.0,
        cloud_cover_percent=None
    )
    
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [missing_cc_record]
        
        response = client.post("/ml/forecast", json={
            "latitude": 25.467,
            "longitude": 91.366,
            "lead_time": 24
        })
        
        assert response.status_code == 200
        snap = response.json()
        assert snap["model_status"] == "FALLBACK_RAW_NWP"
        assert snap["fallback"] is True
        assert "forecast_cloud_cover" in snap["fallback_reason"]
        assert snap["rainfall_mm"] == 20.0

def test_probability_propagates_snapshot_model_status():
    mock_stats = MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.45}, perturbed_member_count=50)
    
    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=mock_stats)]
        
        snap_corrected = {
            "snapshot_id": "snap-test-1",
            "timestamp": "2026-09-03T00:00:00Z",
            "latitude": 25.467,
            "longitude": 91.366,
            "lead_hours": 24,
            "provider": "open-meteo-single-runs",
            "provider_model": "ecmwf_ifs025",
            "nwp_valid_time": "2026-09-04T00:00:00Z",
            "nwp_initialization_time": None,
            "model_id": "hazardguard_v7_24h",
            "model_type": "Residual",
            "rainfall_mm": 18.2,
            "model_status": "DEPLOY_CORRECTED",
            "fallback": False
        }
        res = client.post("/ml/probability", json=snap_corrected)
        assert res.status_code == 200
        assert res.json()["model_status"] == "DEPLOY_CORRECTED"
        assert res.json()["calibration_status"] == "UNCALIBRATED_RAW_ENSEMBLE"
        
        snap_fallback = {**snap_corrected, "model_status": "FALLBACK_RAW_NWP", "fallback": True}
        res2 = client.post("/ml/probability", json=snap_fallback)
        assert res2.status_code == 200
        assert res2.json()["model_status"] == "FALLBACK_RAW_NWP"

def test_verification_derives_model_type_from_registry():
    spoofed_48h = {
        "snapshot_id": "snap-spoof-48",
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_hours": 48,
        "provider": "open-meteo-single-runs",
        "provider_model": "ecmwf_ifs025",
        "nwp_valid_time": "2026-09-05T00:00:00Z",
        "nwp_initialization_time": None,
        "model_id": "RAW_NWP",
        "model_type": "Residual",
        "rainfall_mm": 10.0,
        "model_status": "FALLBACK_RAW_NWP",
        "fallback": True
    }
    
    res = client.post("/ml/verification", json=spoofed_48h)
    assert res.status_code == 200
    data = res.json()
    
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)
    entry_48 = next(e for e in registry if float(e["lead"]) == 48.0)
    expected_raw_rmse = entry_48["metrics"]["RAW"]["rmse"]
    residual_rmse = entry_48["metrics"]["Residual"]["rmse"]
    
    assert data["RMSE"] == expected_raw_rmse
    assert data["RMSE"] != residual_rmse

def test_registry_path_works_independently_of_cwd(tmp_path):
    orig_cwd = os.getcwd()
    try:
        os.chdir(tmp_path)
        metrics, entry = get_registry_metrics(24)
        assert "rmse" in metrics
        assert float(entry["lead"]) == 24.0
        
        loader = BiasCorrectorModel()
        assert 24.0 in loader.models
    finally:
        os.chdir(orig_cwd)

def test_115_5_threshold_key_consistency():
    stats = compute_ensemble_stats([120.0, 130.0, 50.0], expected_member_count=3)
    assert "p_ge_115_5mm" in stats.exceedance_probabilities
    
    rec = CanonicalForecastRecord(
        source="ECMWF",
        dataset_version="1.0",
        valid_time="2026-09-03T00:00:00Z",
        ingestion_time="2026-09-03T00:00:00Z",
        latitude=25.467,
        longitude=91.366,
        grid_id="grid_25.4670_91.3660",
        forecast_rainfall_mm=100.0,
        ensemble_stats=stats
    )
    
    features = FeatureExtractor.extract_features(rec)
    assert features["prob_ge_115_5mm"] > 0.0
    assert features["prob_ge_115_6mm"] == features["prob_ge_115_5mm"]

def test_dataset_metadata_diagnosis():
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        registry = json.load(f)
    
    for entry in registry:
        row_counts = entry["row_counts"]
        assert row_counts["train"] == 7521
        assert row_counts["val"] == 2139
        assert row_counts["test"] == 2070

# ==============================================================================
# Focused Tests for 8 Surgical Fixes from Latest Independent Audit
# ==============================================================================

def test_stale_metadata_artifact_superseded_marker():
    """Item 2: ml/models/metadata.json must declare status SUPERSEDED by model_registry.json while keeping history."""
    meta_path = Path(__file__).resolve().parent.parent.parent.parent / "ml" / "models" / "metadata.json"
    assert meta_path.exists()
    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["status"] == "SUPERSEDED"
    assert data["superseded_by"] == "model_registry.json"
    # Verify historical content preserved
    assert data["provider"] == "open-meteo-single-runs"
    assert data["model"] == "ecmwf_ifs025"
    assert "feature_list" in data

def test_forecast_snapshot_nwp_provenance_and_null_init_time():
    """Item 3: ForecastSnapshot contains nwp_valid_time and nwp_initialization_time = None for Open-Meteo."""
    res = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 24})
    assert res.status_code == 200
    data = res.json()
    assert "nwp_valid_time" in data
    assert isinstance(data["nwp_valid_time"], str)
    assert len(data["nwp_valid_time"]) > 0
    assert "nwp_initialization_time" in data
    assert data["nwp_initialization_time"] is None

def test_scientific_context_requires_verification_status_and_rejects_arbitrary_string():
    """Item 4: ScientificContext verification_status is required and constrained to VERIFIED or NOT_VALIDATED."""
    from ml.api.context import ScientificContext
    from pydantic import ValidationError

    base_kwargs = {
        "snapshot_id": "snap-ctx-test",
        "issue_time": "2026-09-03T00:00:00Z",
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_hours": 24,
        "forecast_rainfall_mm": 20.0,
        "event_probability": 0.5,
        "provider": "ecmwf_ifs",
        "provider_model": "ecmwf_ifs025",
        "deployed_model_id": "hazardguard_v7_24h",
        "model_type": "Residual",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False,
        "meteorological_intensity": "MODERATE",
    }

    # Missing verification_status must raise ValidationError (cannot silently default to VERIFIED)
    with pytest.raises(ValidationError):
        ScientificContext(**base_kwargs)

    # Arbitrary string must be rejected
    with pytest.raises(ValidationError):
        ScientificContext(**base_kwargs, verification_status="INVALID_STATUS")

    # Explicit VERIFIED accepted
    ctx_v = ScientificContext(**base_kwargs, verification_status="VERIFIED")
    assert ctx_v.verification_status == "VERIFIED"

    # Explicit NOT_VALIDATED accepted
    ctx_nv = ScientificContext(**base_kwargs, verification_status="NOT_VALIDATED")
    assert ctx_nv.verification_status == "NOT_VALIDATED"

def test_impact_request_from_snapshot_requires_verification_status():
    """Item 5: ImpactRequest.from_snapshot() requires caller to provide verification_status."""
    from ml.api.impact import ImpactRequest

    mock_snap = {
        "snapshot_id": "snap-from-test",
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_hours": 24,
        "rainfall_mm": 18.0,
        "model_id": "hazardguard_v7_24h",
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False
    }

    # Calling without verification_status must raise TypeError (required parameter)
    with pytest.raises(TypeError):
        ImpactRequest.from_snapshot(mock_snap, event_probability=0.3)

    # Calling with valid verification_status must succeed
    req = ImpactRequest.from_snapshot(mock_snap, event_probability=0.3, verification_status="VERIFIED")
    assert req.verification_status == "VERIFIED"
    assert req.rainfall_mm == 18.0
    assert req.event_probability == 0.3

def test_probability_response_quality_and_cache_status_fields():
    snap = {
        "snapshot_id": "snap-prob-fields",
        "timestamp": "2026-09-03T00:00:00Z",
        "latitude": 25.467,
        "longitude": 91.366,
        "lead_hours": 24,
        "provider": "open-meteo-single-runs",
        "provider_model": "ecmwf_ifs025",
        "nwp_valid_time": "2026-09-04T00:00:00Z",
        "nwp_initialization_time": None,
        "model_id": "hazardguard_v7_24h",
        "model_type": "Residual",
        "rainfall_mm": 20.0,
        "model_status": "DEPLOY_CORRECTED",
        "fallback": False
    }

    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 0.4}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=snap)
        pdata = res.json()
        assert pdata["probability"] == 0.4

    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": 1.5}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=snap)
        pdata = res.json()
        assert pdata["probability"] is None
        assert pdata["probability_available"] is False
        assert pdata["ensemble_quality"] == "INVALID"

    with patch("ml.api.main.provider.fetch_forecasts") as mock_fetch:
        mock_fetch.return_value = [MagicMock(ensemble_stats=MagicMock(exceedance_probabilities={"p_ge_15_6mm": -0.2}, perturbed_member_count=50))]
        res = client.post("/ml/probability", json=snap)
        pdata = res.json()
        assert pdata["probability"] is None
        assert pdata["probability_available"] is False
        assert pdata["ensemble_quality"] == "INVALID"

def test_cache_dir_path_independent_of_cwd(tmp_path):
    from ml.data.providers.openmeteo import OpenMeteoEnsembleProvider
    from ml.data.providers.base import ProviderConfig, ProviderCapabilities
    from ml.config.settings import CACHE_DIR

    orig_cwd = os.getcwd()
    try:
        os.chdir(tmp_path)
        cfg = ProviderConfig(
            provider_id="test_prov",
            model_id="test_model",
            source_name="Test",
            native_resolution=0.25,
            forecast_interval_hours=24,
            forecast_horizon_hours=240,
            expected_ensemble_members=50,
            run_frequency_hours=12,
            capabilities=ProviderCapabilities(has_ensemble=True)
        )
        prov = OpenMeteoEnsembleProvider(cfg)
        assert prov.cache_dir == CACHE_DIR
    finally:
        os.chdir(orig_cwd)

def test_full_chain_coherence_with_new_provenance_and_quality():
    res_f = client.post("/ml/forecast", json={"latitude": 25.467, "longitude": 91.366, "lead_time": 24})
    snap = res_f.json()
    res_p = client.post("/ml/probability", json=snap)
    prob = res_p.json()
    res_v = client.post("/ml/verification", json=snap)
    verif = res_v.json()
    from ml.api.impact import ImpactRequest
    impact_req = ImpactRequest.from_snapshot(
        snapshot=snap,
        event_probability=prob.get("probability", 0.0) or 0.0,
        verification_status=verif["verification_status"]
    )
    res_i = client.post("/ml/impact", json=impact_req.model_dump())
    hazard = res_i.json()
    assert hazard["snapshot_id"] == snap["snapshot_id"]
