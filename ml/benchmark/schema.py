from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional


@dataclass(frozen=True)
class BenchmarkConfig:
    """Configuration for deterministic benchmark scoring."""
    evaluation_start: Optional[str] = None
    evaluation_end: Optional[str] = None
    lead_time_hours: float = 24.0
    primary_threshold_mm: float = 64.5
    additional_thresholds_mm: List[float] = field(default_factory=list)
    bootstrap_resamples: int = 1000
    bootstrap_seed: int = 42
    confidence_level: float = 0.95
    require_complete_24h_windows: bool = True
    target_grid: str = "0.25_degree_regular_lat_lon"
    regridding_method: str = "conservative_remapping_0.1_to_0.25"
    accumulation_method: str = "24h_sum_00Z_to_00Z"
    reference_source: str = "era5"
    reference_cutoff_dt: Optional[str] = None


@dataclass(frozen=True)
class BenchmarkPairRecord:
    """
    A verified, paired observation containing both ECMWF and WeatherNext forecasts
    alongside the ERA5 reference ground truth for an identical spatial cell and valid period.
    """
    grid_id: str
    latitude: float
    longitude: float
    init_time: str
    valid_time: str
    lead_time_hours: float
    ecmwf_rainfall_mm_24h: float
    weathernext_rainfall_mm_24h: float
    reference_rainfall_mm_24h: float
    ecmwf_run_id: str
    ecmwf_model_id: str = "ecmwf_ifs"
    weathernext_run_id: str = ""
    weathernext_model_id: str = "weathernext_3_0_0_statistics"
    regridding_method: str = "conservative_remapping_0.1_to_0.25"
    accumulation_method: str = "24h_sum_00Z_to_00Z"
    reference_source: str = "era5"
    provenance: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class MetricBundle:
    """Standard primary deterministic metrics."""
    mae: Optional[float]
    rmse: Optional[float]
    mbe: Optional[float]
    pearson_r: Optional[float]
    sample_count: int
    aggregation: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SpatialAggregationResult:
    """Summary of per-grid-cell metrics across space."""
    mean_mae: Optional[float]
    median_mae: Optional[float]
    min_mae: Optional[float]
    max_mae: Optional[float]
    mean_rmse: Optional[float]
    median_rmse: Optional[float]
    min_rmse: Optional[float]
    max_rmse: Optional[float]
    mean_mbe: Optional[float]
    mean_pearson_r: Optional[float]
    num_grid_cells: int
    per_cell_metrics: Dict[str, Dict[str, Any]]
    aggregation_description: str = "Per-grid-cell time-series verification, then aggregated spatially"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class TemporalAggregationResult:
    """Summary of per-valid-time metrics across time."""
    mean_mae: Optional[float]
    median_mae: Optional[float]
    min_mae: Optional[float]
    max_mae: Optional[float]
    mean_rmse: Optional[float]
    median_rmse: Optional[float]
    min_rmse: Optional[float]
    max_rmse: Optional[float]
    mean_mbe: Optional[float]
    mean_pearson_r: Optional[float]
    num_time_steps: int
    per_time_metrics: Dict[str, Dict[str, Any]]
    aggregation_description: str = "Per-valid-time spatial verification, then aggregated temporally"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CategoricalMetrics:
    """Heavy-rain deterministic rainfall threshold classification metrics."""
    threshold_mm: float
    pod: Optional[float]
    far: Optional[float]
    csi: Optional[float]
    hits: int
    misses: int
    false_alarms: int
    correct_negatives: int
    total_samples: int
    metric_type: str = "deterministic rainfall threshold metrics"
    disclaimer: str = (
        "categorical performance is deterministic threshold classification, "
        "not probabilistic exceedance forecasting or flood/landslide hazard threshold."
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class StatisticalComparisonResult:
    """Paired statistical comparison between ECMWF and WeatherNext."""
    metric_name: str
    ecmwf_score: Optional[float]
    weathernext_score: Optional[float]
    difference: Optional[float]  # WeatherNext - ECMWF
    ci_lower: Optional[float]
    ci_upper: Optional[float]
    confidence_level: float
    p_value: Optional[float]
    bootstrap_resamples: int
    random_seed: int
    block_type: str = "daily_date_blocks"
    clustering_description: str = (
        "Resampled by whole dates; all spatial grid cells belonging to each date kept together as a single block"
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class CoverageStatistics:
    """Accounting for raw records, rejections, intersection, and final benchmark set."""
    total_candidate_windows: int
    raw_records_before_intersection: Dict[str, int]
    aligned_records: int
    rejected_vintage_records: int
    rejected_incomplete_window_records: int
    retained_benchmark_records: int
    number_of_complete_windows: int
    evaluation_start: str
    evaluation_end: str
    expected_windows: int = 0
    missing_windows: List[str] = field(default_factory=list)
    coverage_ratio: float = 1.0
    coverage_status: str = "complete"
    reference_cutoff_utc: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class BenchmarkResult:
    """Complete machine-readable result of the benchmark scoring layer."""
    benchmark_id: str
    evaluation_start: str
    evaluation_end: str
    number_of_complete_windows: int
    providers: List[str]
    reference_source: str
    grid: str
    accumulation_window_hours: float
    sample_count: int
    coverage_statistics: CoverageStatistics
    metrics: Dict[str, Any]
    categorical_metrics: Dict[str, Dict[str, Any]]
    statistical_comparison: Dict[str, Any]
    probabilistic_benchmark_available: bool = False
    provenance: Dict[str, Any] = field(default_factory=dict)
    limitations: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # Ensure boolean is strictly boolean
        d["probabilistic_benchmark_available"] = False
        return d

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent)
