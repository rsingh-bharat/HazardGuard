"""Test suite for Phase 2 Feature Engineering."""

import math
import numpy as np
import pytest
from ml.data.schema import CanonicalForecastRecord, EnsembleStats
from ml.features.extractor import FeatureExtractor, FEATURE_SCHEMA_VERSION

def test_feature_extraction_preserves_missing_atmospherics():
    """Verify that absent atmospheric fields remain missing and are not fabricated."""
    
    # Record lacking all optional atmospheric fields
    rec = CanonicalForecastRecord(
        source="ECMWF",
        dataset_version="1.0",
        valid_time="2026-09-02T12:00:00Z",
        ingestion_time="2026-09-02T10:00:00Z",
        latitude=20.0,
        longitude=80.0,
        grid_id="grid_20.0000_80.0000",
        forecast_rainfall_mm=12.5
    )
    
    features = FeatureExtractor.extract_features(rec)
    
    assert features["forecastRainfallMm"] == 12.5
    assert math.isnan(features["surfacePressureHpa"])
    assert math.isnan(features["windSpeedKmh"])
    
    # Temporal mapping
    assert features["hour_of_day"] == 12

def test_feature_extraction_ensemble_stats():
    """Verify ensemble stats are correctly unrolled into the feature dictionary."""
    stats = EnsembleStats(
        mean=10.0, median=9.0, p10=2.0, p25=5.0, p50=9.0, p75=15.0, p90=20.0,
        std=4.5, min=0.0, max=30.0, member_count=51, perturbed_member_count=50,
        control_value=12.5, exceedance_probabilities={"p_ge_15_6mm": 0.25}
    )
    
    rec = CanonicalForecastRecord(
        source="ECMWF",
        dataset_version="1.0",
        valid_time="2026-09-02T12:00:00Z",
        ingestion_time="2026-09-02T10:00:00Z",
        latitude=20.0,
        longitude=80.0,
        grid_id="grid_20.0000_80.0000",
        forecast_rainfall_mm=12.5,
        ensemble_stats=stats
    )
    
    features = FeatureExtractor.extract_features(rec)
    
    assert features["ens_mean"] == 10.0
    assert features["ens_perturbed_member_count"] == 50
    assert features["prob_ge_15_6mm"] == 0.25
    assert features["prob_ge_115_6mm"] == 0.0  # Missing should default safely
    

    
def test_india_wide_bounds_respected():
    """Verify the scope is inherently unrestricted to Meghalaya."""
    from ml.data.normalizer import validate_coordinates
    assert validate_coordinates(35.0, 75.0, enforce_india=True) # North
    assert validate_coordinates(10.0, 77.0, enforce_india=True) # South
    assert not validate_coordinates(45.0, 100.0, enforce_india=True) # China
