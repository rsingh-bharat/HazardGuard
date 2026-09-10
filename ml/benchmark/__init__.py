"""
Benchmark Scoring and Reporting Layer for HazardGuard / Handoff2.

Provides deterministic, auditable verification scoring for ECMWF, WeatherNext 3,
and ERA5 historical reference observations.
"""

from ml.benchmark.schema import (
    BenchmarkConfig,
    BenchmarkPairRecord,
    MetricBundle,
    SpatialAggregationResult,
    TemporalAggregationResult,
    CategoricalMetrics,
    StatisticalComparisonResult,
    CoverageStatistics,
    BenchmarkResult,
)
from ml.benchmark.evaluator import BenchmarkEvaluator
from ml.benchmark.reporting import BenchmarkReportGenerator

__all__ = [
    "BenchmarkConfig",
    "BenchmarkPairRecord",
    "MetricBundle",
    "SpatialAggregationResult",
    "TemporalAggregationResult",
    "CategoricalMetrics",
    "StatisticalComparisonResult",
    "CoverageStatistics",
    "BenchmarkResult",
    "BenchmarkEvaluator",
    "BenchmarkReportGenerator",
]
