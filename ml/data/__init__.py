"""HazardGuard Canonical Data Layer."""

from ml.data.alignment import ForecastObservationAligner
from ml.data.loader import CanonicalDataLoader
from ml.data.normalizer import (
    deduplicate_forecasts,
    deduplicate_observations,
    format_grid_id,
    normalize_rainfall_unit,
    parse_iso_utc,
    validate_coordinates,
)
from ml.data.schema import (
    CanonicalAlignedPair,
    CanonicalForecastRecord,
    CanonicalObservationRecord,
    EnsembleStats,
    ProvenanceInfo,
)
from ml.data.weathernext_ingest import (
    WeatherNextIngestor,
    compute_ensemble_stats,
)

__all__ = [
    "ForecastObservationAligner",
    "CanonicalDataLoader",
    "deduplicate_forecasts",
    "deduplicate_observations",
    "format_grid_id",
    "normalize_rainfall_unit",
    "parse_iso_utc",
    "validate_coordinates",
    "CanonicalAlignedPair",
    "CanonicalForecastRecord",
    "CanonicalObservationRecord",
    "EnsembleStats",
    "ProvenanceInfo",
    "WeatherNextIngestor",
    "compute_ensemble_stats",
]
