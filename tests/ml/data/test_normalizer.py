"""Unit tests for data normalization, coordinate validation, unit conversion, and deduplication."""

import pytest
from ml.data.normalizer import (
    deduplicate_forecasts,
    deduplicate_observations,
    format_grid_id,
    normalize_rainfall_unit,
    validate_coordinates,
)
from ml.data.schema import CanonicalForecastRecord, CanonicalObservationRecord, ProvenanceInfo


def test_unit_normalization():
    # Exact unit conversions
    assert normalize_rainfall_unit(1.0, "mm") == 1.0
    assert pytest.approx(normalize_rainfall_unit(1.0, "in"), 0.001) == 25.4
    assert pytest.approx(normalize_rainfall_unit(2.0, "inch"), 0.001) == 50.8
    assert pytest.approx(normalize_rainfall_unit(1.0, "cm"), 0.001) == 10.0
    assert pytest.approx(normalize_rainfall_unit(0.5, "m"), 0.001) == 500.0


def test_unit_normalization_rejections():
    # Negative rainfall
    with pytest.raises(ValueError, match="negative rainfall"):
        normalize_rainfall_unit(-5.0, "mm")

    # Non-finite values
    with pytest.raises(ValueError, match="non-finite"):
        normalize_rainfall_unit(float("nan"), "mm")
    with pytest.raises(ValueError, match="non-finite"):
        normalize_rainfall_unit(float("inf"), "mm")

    # Unsupported unit
    with pytest.raises(ValueError, match="Unsupported rainfall unit"):
        normalize_rainfall_unit(10.0, "feet")


def test_coordinate_validation():
    # Valid global coordinates
    assert validate_coordinates(26.15, 91.75, enforce_india=False)
    assert validate_coordinates(-33.86, 151.20, enforce_india=False)

    # Invalid global coordinates
    assert not validate_coordinates(95.0, 80.0, enforce_india=False)
    assert not validate_coordinates(20.0, 200.0, enforce_india=False)
    assert not validate_coordinates(float("nan"), 80.0, enforce_india=False)

    # India bounds enforcement (6..38 N, 68..98 E)
    assert validate_coordinates(28.61, 77.20, enforce_india=True)  # Delhi
    assert validate_coordinates(26.14, 91.77, enforce_india=True)  # Guwahati
    assert validate_coordinates(13.08, 80.27, enforce_india=True)  # Chennai
    assert not validate_coordinates(51.50, -0.12, enforce_india=True)  # London outside India


def test_grid_id_formatting():
    # Test strict preservation to 4 decimal places without arbitrary snapping
    assert format_grid_id(24.01, 89.04) == "grid_24.0100_89.0400"
    assert format_grid_id(24.08, 89.07) == "grid_24.0800_89.0700"
    assert format_grid_id(24.25, 89.25) == "grid_24.2500_89.2500"
    assert format_grid_id(24.12345, 89.12345) == "grid_24.1234_89.1235"


def test_observation_deduplication():
    # Two records for same grid and valid_time with different ingestion times
    prov1 = ProvenanceInfo("IMD", "v1", "r1", "2023-01-01T01:00:00Z", "1.0")
    prov2 = ProvenanceInfo("IMD", "v1", "r2", "2023-01-01T02:00:00Z", "1.0")  # Newer

    obs1 = CanonicalObservationRecord(
        source="IMD",
        dataset_version="1.0",
        valid_time="2023-01-01T00:00:00Z",
        ingestion_time="2023-01-01T01:00:00Z",
        latitude=26.0,
        longitude=91.0,
        grid_id="grid_26.0000_91.0000",
        observed_rainfall_mm=10.0,
        provenance=prov1,
    )
    obs2 = CanonicalObservationRecord(
        source="IMD",
        dataset_version="1.0",
        valid_time="2023-01-01T00:00:00Z",
        ingestion_time="2023-01-01T02:00:00Z",  # Newer correction
        latitude=26.0,
        longitude=91.0,
        grid_id="grid_26.0000_91.0000",
        observed_rainfall_mm=12.5,
        provenance=prov2,
    )

    deduped = deduplicate_observations([obs1, obs2])
    assert len(deduped) == 1
    assert deduped[0].observed_rainfall_mm == 12.5
    assert deduped[0].ingestion_time == "2023-01-01T02:00:00Z"
