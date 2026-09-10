"""Canonical schemas and data structures for WeatherNext 2, observations, and aligned training sets."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class ProvenanceInfo:
    """Auditable lineage and metadata for data records."""

    source: str
    model_id: str
    run_id: str
    ingestion_timestamp: str
    dataset_version: str
    init_time: Optional[str] = None
    valid_time: Optional[str] = None
    run_status: Optional[str] = None
    init_time_source: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class EnsembleStats:
    """Ensemble statistical moments and exceedance probabilities from WeatherNext 2."""

    mean: float
    median: float
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    std: float
    min: float
    max: float
    member_count: int
    perturbed_member_count: int = 0
    control_value: Optional[float] = None
    missing_members: List[str] = field(default_factory=list)
    exceedance_probabilities: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DistributionType:
    SINGLE_VALUE = "SINGLE_VALUE"
    ENSEMBLE_STATISTICS = "ENSEMBLE_STATISTICS"


@dataclass(frozen=True)
class ForecastDistribution:
    """Explicitly distinguishes single-value deterministic forecasts from genuine ensemble statistics."""
    type: str  # SINGLE_VALUE | ENSEMBLE_STATISTICS
    # Genuine statistical percentiles (populated ONLY for ENSEMBLE_STATISTICS with full distribution)
    # When only marginal quantiles are available, cumulative quantiles remain None.
    p10_mm: Optional[float] = None
    p25_mm: Optional[float] = None
    p50_mm: Optional[float] = None
    p75_mm: Optional[float] = None
    p90_mm: Optional[float] = None
    mean_mm: Optional[float] = None
    std_mm: Optional[float] = None
    # Deterministic impact scenarios (for SINGLE_VALUE impact domain)
    low_scenario_mm: Optional[float] = None
    base_scenario_mm: Optional[float] = None
    high_scenario_mm: Optional[float] = None
    accumulation_hours: Optional[float] = None
    # Quality indicator: e.g. MARGINAL_QUANTILE_ONLY, FULL_ENSEMBLE
    statistics_quality: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CanonicalForecastRecord:
    """Ingested and normalized numerical/ensemble forecast record."""

    source: str
    dataset_version: str
    valid_time: str           # Forecast target time (ISO8601 UTC)
    ingestion_time: str       # Timestamp when ingested into HazardGuard
    latitude: float
    longitude: float
    grid_id: str
    forecast_rainfall_mm: float
    initialization_time: Optional[str] = None  # Model run/issue time (ISO8601 UTC)
    lead_time_hours: Optional[float] = None    # Exact lead time in hours
    ensemble_stats: Optional[EnsembleStats] = None
    distribution: Optional[ForecastDistribution] = None
    surface_pressure_hpa: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    temperature_celsius: Optional[float] = None
    relative_humidity_percent: Optional[float] = None
    cloud_cover_percent: Optional[float] = None
    provenance: Optional[ProvenanceInfo] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CanonicalObservationRecord:
    """Ingested and normalized rainfall observation / reanalysis ground truth."""

    source: str
    dataset_version: str
    valid_time: str           # Observation period timestamp (ISO8601 UTC)
    ingestion_time: str       # Timestamp when ingested
    latitude: float
    longitude: float
    grid_id: str
    observed_rainfall_mm: float
    reference_rainfall_mm: Optional[float] = None
    observation_type: str = "REANALYSIS"  # STATION | SATELLITE | REANALYSIS | RADAR
    provenance: Optional[ProvenanceInfo] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CanonicalAlignedPair:
    """Strictly aligned forecast-observation record ready for feature engineering and training."""

    pair_id: str
    dataset_version: str
    source_forecast: str
    source_observation: str
    valid_time: str           # Verification valid time
    ingestion_time_forecast: str
    ingestion_time_observation: str
    latitude: float
    longitude: float
    grid_id: str
    forecast_rainfall_mm: float
    observed_rainfall_mm: float
    initialization_time: Optional[str] = None  # When forecast was initialized
    lead_time_hours: Optional[float] = None    # Lead time in hours
    reference_rainfall_mm: Optional[float] = None
    ensemble_stats: Optional[EnsembleStats] = None
    surface_pressure_hpa: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    temperature_celsius: Optional[float] = None
    relative_humidity_percent: Optional[float] = None
    cloud_cover_percent: Optional[float] = None
    provenance_forecast: Optional[ProvenanceInfo] = None
    provenance_observation: Optional[ProvenanceInfo] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DatasetManifest:
    """Deterministic cryptographic manifest and metadata for a canonical dataset."""

    dataset_version: str
    created_at: str
    source_forecast: str
    source_reference: str
    date_range_start: str
    date_range_end: str
    spatial_bounds: Dict[str, float]
    total_record_count: int
    unique_grids: int
    unique_valid_times: int
    lead_times_hours: List[float]
    sha256_checksum: str
    data_quality_summary: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
