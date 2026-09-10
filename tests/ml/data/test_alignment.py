"""Unit tests for spatiotemporal alignment, strict causality, and chronological splitting."""

import pytest
from ml.data.alignment import ForecastObservationAligner
from ml.data.schema import CanonicalForecastRecord, CanonicalObservationRecord, ProvenanceInfo


def test_forecast_observation_alignment():
    aligner = ForecastObservationAligner()

    fcst1 = CanonicalForecastRecord(
        source="WeatherNext2",
        dataset_version="1.0",
        initialization_time="2023-06-01T00:00:00Z",
        valid_time="2023-06-02T00:00:00Z",
        lead_time_hours=24.0,
        ingestion_time="2023-06-01T01:00:00Z",
        latitude=26.0,
        longitude=91.0,
        grid_id="grid_26.0000_91.0000",
        forecast_rainfall_mm=45.0,
    )
    # Forecast with no matching observation
    fcst2 = CanonicalForecastRecord(
        source="WeatherNext2",
        dataset_version="1.0",
        initialization_time="2023-06-01T00:00:00Z",
        valid_time="2023-06-02T00:00:00Z",
        lead_time_hours=24.0,
        ingestion_time="2023-06-01T01:00:00Z",
        latitude=28.0,
        longitude=93.0,
        grid_id="grid_28.0000_93.0000",
        forecast_rainfall_mm=10.0,
    )

    obs1 = CanonicalObservationRecord(
        source="ERA5",
        dataset_version="1.0",
        valid_time="2023-06-02T00:00:00Z",
        ingestion_time="2023-06-03T01:00:00Z",
        latitude=26.0,
        longitude=91.0,
        grid_id="grid_26.0000_91.0000",
        observed_rainfall_mm=50.0,
    )

    pairs = aligner.align([fcst1, fcst2], [obs1])

    # Only matching pair retained, no silent imputation for fcst2
    assert len(pairs) == 1
    p = pairs[0]
    assert p.grid_id == "grid_26.0000_91.0000"
    assert p.forecast_rainfall_mm == 45.0
    assert p.observed_rainfall_mm == 50.0
    assert p.initialization_time == "2023-06-01T00:00:00Z"
    assert p.valid_time == "2023-06-02T00:00:00Z"
    assert p.lead_time_hours == 24.0


def test_causality_violation_rejection():
    aligner = ForecastObservationAligner()

    # Initialization time is AFTER valid time (impossible future initialization)
    invalid_fcst = CanonicalForecastRecord(
        source="WeatherNext2",
        dataset_version="1.0",
        initialization_time="2023-06-05T00:00:00Z",
        valid_time="2023-06-02T00:00:00Z",  # in the past relative to init
        lead_time_hours=24.0,
        ingestion_time="2023-06-05T01:00:00Z",
        latitude=26.0,
        longitude=91.0,
        grid_id="grid_26.0000_91.0000",
        forecast_rainfall_mm=45.0,
    )
    obs = CanonicalObservationRecord(
        source="ERA5",
        dataset_version="1.0",
        valid_time="2023-06-02T00:00:00Z",
        ingestion_time="2023-06-03T01:00:00Z",
        latitude=26.0,
        longitude=91.0,
        grid_id="grid_26.0000_91.0000",
        observed_rainfall_mm=50.0,
    )

    with pytest.raises(ValueError, match="Temporal causality violation"):
        aligner.align([invalid_fcst], [obs], enforce_causality=True)


def test_chronological_splitting():
    aligner = ForecastObservationAligner()

    pairs = []
    for day in range(1, 11):
        fcst = CanonicalForecastRecord(
            source="WeatherNext2",
            dataset_version="1.0",
            initialization_time=f"2023-06-{day:02d}T00:00:00Z",
            valid_time=f"2023-06-{day+1:02d}T00:00:00Z",
            lead_time_hours=24.0,
            ingestion_time=f"2023-06-{day:02d}T01:00:00Z",
            latitude=26.0,
            longitude=91.0,
            grid_id="grid_26.0000_91.0000",
            forecast_rainfall_mm=10.0 + day,
        )
        obs = CanonicalObservationRecord(
            source="ERA5",
            dataset_version="1.0",
            valid_time=f"2023-06-{day+1:02d}T00:00:00Z",
            ingestion_time=f"2023-06-{day+2:02d}T01:00:00Z",
            latitude=26.0,
            longitude=91.0,
            grid_id="grid_26.0000_91.0000",
            observed_rainfall_mm=12.0 + day,
        )
        pairs.extend(aligner.align([fcst], [obs]))

    train, val, test = aligner.chronological_split(pairs, train_ratio=0.6, val_ratio=0.2)

    assert len(train) == 6
    assert len(val) == 2
    assert len(test) == 2

    # Check strict time boundary: max(train) < min(val) and max(val) < min(test)
    assert train[-1].valid_time < val[0].valid_time
    assert val[-1].valid_time < test[0].valid_time
