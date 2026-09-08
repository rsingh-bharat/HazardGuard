"""Provider architecture and contract tests."""

import pytest
from datetime import datetime, timezone
from ml.data.providers.factory import get_provider, get_default_provider
from ml.data.providers.base import ProviderConfig
from ml.data.schema import CanonicalForecastRecord

def test_provider_factory_routing():
    """Verify factory returns correct provider or raises NotImplementedError."""
    ecmwf = get_provider("ecmwf_ifs")
    assert ecmwf.provider_id == "ecmwf_ifs"
    assert ecmwf.expected_members == 51
    
    gefs = get_provider("gefs")
    assert gefs.provider_id == "gefs"
    assert gefs.expected_members == 31
    
    with pytest.raises(NotImplementedError, match="WeatherNext 2 provider requires valid IAM access"):
        get_provider("weathernext2")

def test_default_provider_is_ecmwf():
    """Verify fallback policy strictly defaults to ECMWF."""
    prov = get_default_provider()
    assert prov.provider_id == "ecmwf_ifs"

def test_openmeteo_canonical_mapping(monkeypatch):
    """Test that OpenMeteo responses are perfectly mapped to canonical schemas (Synthetic Fixture)."""
    prov = get_provider("ecmwf_ifs")
    
    # Mock the internal fetch method
    def mock_fetch(*args, **kwargs):
        # 50 perturbed members + 1 main
        hourly = {"time": ["2026-09-02T00:00"], "precipitation": [1.0]}
        for i in range(1, 51):
            hourly[f"precipitation_member{i:02d}"] = [1.0 + (i * 0.1)]
            
        return [{
            "latitude": 28.6,
            "longitude": 77.2,
            "hourly": hourly
        }]
        
    monkeypatch.setattr(prov, "_fetch_with_retry_and_cache", mock_fetch)
    
    records = prov.fetch_forecasts(
        lats=[28.6], lons=[77.2],
        start_date="2026-09-02", end_date="2026-09-02"
    )
    
    assert len(records) == 1
    rec = records[0]
    assert isinstance(rec, CanonicalForecastRecord)
    assert rec.source == "ECMWF-IFS-OpenMeteo"
    assert rec.ensemble_stats is not None
    assert rec.ensemble_stats.member_count == 51
    assert rec.ensemble_stats.perturbed_member_count == 50
    assert rec.ensemble_stats.control_value == 1.0
    assert len(rec.ensemble_stats.missing_members) == 0
    assert rec.initialization_time is None
    assert rec.lead_time_hours is None

