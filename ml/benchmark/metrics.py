from __future__ import annotations

from typing import List, Dict, Tuple, Optional, Any
from collections import defaultdict
import numpy as np

from ml.benchmark.schema import (
    BenchmarkPairRecord,
    MetricBundle,
    SpatialAggregationResult,
    TemporalAggregationResult,
    CategoricalMetrics,
)


def compute_mae(forecasts: np.ndarray, references: np.ndarray) -> Optional[float]:
    """Mean Absolute Error: mean(abs(forecast - reference))."""
    if len(forecasts) == 0:
        return None
    return float(np.mean(np.abs(forecasts - references)))


def compute_rmse(forecasts: np.ndarray, references: np.ndarray) -> Optional[float]:
    """Root Mean Squared Error: sqrt(mean((forecast - reference)^2))."""
    if len(forecasts) == 0:
        return None
    return float(np.sqrt(np.mean((forecasts - references) ** 2)))


def compute_mbe(forecasts: np.ndarray, references: np.ndarray) -> Optional[float]:
    """Mean Bias Error: mean(forecast - reference)."""
    if len(forecasts) == 0:
        return None
    return float(np.mean(forecasts - references))


def compute_pearson_r(forecasts: np.ndarray, references: np.ndarray) -> Optional[float]:
    """
    Pearson correlation coefficient between forecasts and references.
    Explicitly handles zero-variance or sample size < 2 by returning None rather than NaN.
    """
    if len(forecasts) < 2:
        return None
    f_std = float(np.std(forecasts, ddof=0))
    r_std = float(np.std(references, ddof=0))
    if f_std < 1e-12 or r_std < 1e-12:
        # Undefined when variance is zero
        return None
    cov = float(np.mean((forecasts - np.mean(forecasts)) * (references - np.mean(references))))
    r = cov / (f_std * r_std)
    # Clip to valid mathematical bounds
    return float(np.clip(r, -1.0, 1.0))


def compute_metric_bundle(forecasts: np.ndarray, references: np.ndarray, aggregation_name: str) -> MetricBundle:
    """Computes all primary deterministic continuous metrics for a pair of arrays."""
    n = len(forecasts)
    if n == 0:
        return MetricBundle(
            mae=None,
            rmse=None,
            mbe=None,
            pearson_r=None,
            sample_count=0,
            aggregation=aggregation_name,
        )
    return MetricBundle(
        mae=compute_mae(forecasts, references),
        rmse=compute_rmse(forecasts, references),
        mbe=compute_mbe(forecasts, references),
        pearson_r=compute_pearson_r(forecasts, references),
        sample_count=n,
        aggregation=aggregation_name,
    )


def compute_pooled_metrics(records: List[BenchmarkPairRecord], provider: str) -> MetricBundle:
    """
    Pooled metrics computed across all aligned spatial grid cells and valid times combined.
    """
    if not records:
        return MetricBundle(None, None, None, None, 0, "overall_pooled_records")
    
    if provider == "ecmwf":
        f = np.array([r.ecmwf_rainfall_mm_24h for r in records], dtype=np.float64)
    elif provider in ("weathernext", "weathernext3", "weathernext3_statistics"):
        f = np.array([r.weathernext_rainfall_mm_24h for r in records], dtype=np.float64)
    else:
        raise ValueError(f"Unknown forecast provider: {provider}")

    ref = np.array([r.reference_rainfall_mm_24h for r in records], dtype=np.float64)
    return compute_metric_bundle(f, ref, "overall_pooled_records")


def compute_spatial_metrics(records: List[BenchmarkPairRecord], provider: str) -> SpatialAggregationResult:
    """
    Per-grid-cell metrics across time, then aggregated spatially (mean, median, min, max).
    Does NOT mix spatial variance into time-series evaluation.
    """
    if not records:
        return SpatialAggregationResult(
            mean_mae=None, median_mae=None, min_mae=None, max_mae=None,
            mean_rmse=None, median_rmse=None, min_rmse=None, max_rmse=None,
            mean_mbe=None, mean_pearson_r=None, num_grid_cells=0,
            per_cell_metrics={},
            aggregation_description="Per-grid-cell time-series verification, then aggregated spatially"
        )

    cell_records = defaultdict(list)
    for r in records:
        cell_records[r.grid_id].append(r)

    per_cell = {}
    maes = []
    rmses = []
    mbes = []
    pearsons = []

    for gid, cell_recs in cell_records.items():
        if provider == "ecmwf":
            f = np.array([r.ecmwf_rainfall_mm_24h for r in cell_recs], dtype=np.float64)
        else:
            f = np.array([r.weathernext_rainfall_mm_24h for r in cell_recs], dtype=np.float64)
        ref = np.array([r.reference_rainfall_mm_24h for r in cell_recs], dtype=np.float64)

        bundle = compute_metric_bundle(f, ref, f"cell_{gid}_time_series")
        per_cell[gid] = bundle.to_dict()

        if bundle.mae is not None:
            maes.append(bundle.mae)
        if bundle.rmse is not None:
            rmses.append(bundle.rmse)
        if bundle.mbe is not None:
            mbes.append(bundle.mbe)
        if bundle.pearson_r is not None:
            pearsons.append(bundle.pearson_r)

    return SpatialAggregationResult(
        mean_mae=float(np.mean(maes)) if maes else None,
        median_mae=float(np.median(maes)) if maes else None,
        min_mae=float(np.min(maes)) if maes else None,
        max_mae=float(np.max(maes)) if maes else None,
        mean_rmse=float(np.mean(rmses)) if rmses else None,
        median_rmse=float(np.median(rmses)) if rmses else None,
        min_rmse=float(np.min(rmses)) if rmses else None,
        max_rmse=float(np.max(rmses)) if rmses else None,
        mean_mbe=float(np.mean(mbes)) if mbes else None,
        mean_pearson_r=float(np.mean(pearsons)) if pearsons else None,
        num_grid_cells=len(cell_records),
        per_cell_metrics=per_cell,
        aggregation_description="Per-grid-cell time-series verification, then aggregated spatially"
    )


def compute_temporal_metrics(records: List[BenchmarkPairRecord], provider: str) -> TemporalAggregationResult:
    """
    Per-valid-time metrics across space, then aggregated temporally (mean, median, min, max).
    Evaluates each daily forecast field across space independently.
    """
    if not records:
        return TemporalAggregationResult(
            mean_mae=None, median_mae=None, min_mae=None, max_mae=None,
            mean_rmse=None, median_rmse=None, min_rmse=None, max_rmse=None,
            mean_mbe=None, mean_pearson_r=None, num_time_steps=0,
            per_time_metrics={},
            aggregation_description="Per-valid-time spatial verification, then aggregated temporally"
        )

    time_records = defaultdict(list)
    for r in records:
        time_records[r.valid_time].append(r)

    per_time = {}
    maes = []
    rmses = []
    mbes = []
    pearsons = []

    for vt, t_recs in time_records.items():
        if provider == "ecmwf":
            f = np.array([r.ecmwf_rainfall_mm_24h for r in t_recs], dtype=np.float64)
        else:
            f = np.array([r.weathernext_rainfall_mm_24h for r in t_recs], dtype=np.float64)
        ref = np.array([r.reference_rainfall_mm_24h for r in t_recs], dtype=np.float64)

        bundle = compute_metric_bundle(f, ref, f"time_{vt}_spatial_field")
        per_time[vt] = bundle.to_dict()

        if bundle.mae is not None:
            maes.append(bundle.mae)
        if bundle.rmse is not None:
            rmses.append(bundle.rmse)
        if bundle.mbe is not None:
            mbes.append(bundle.mbe)
        if bundle.pearson_r is not None:
            pearsons.append(bundle.pearson_r)

    return TemporalAggregationResult(
        mean_mae=float(np.mean(maes)) if maes else None,
        median_mae=float(np.median(maes)) if maes else None,
        min_mae=float(np.min(maes)) if maes else None,
        max_mae=float(np.max(maes)) if maes else None,
        mean_rmse=float(np.mean(rmses)) if rmses else None,
        median_rmse=float(np.median(rmses)) if rmses else None,
        min_rmse=float(np.min(rmses)) if rmses else None,
        max_rmse=float(np.max(rmses)) if rmses else None,
        mean_mbe=float(np.mean(mbes)) if mbes else None,
        mean_pearson_r=float(np.mean(pearsons)) if pearsons else None,
        num_time_steps=len(time_records),
        per_time_metrics=per_time,
        aggregation_description="Per-valid-time spatial verification, then aggregated temporally"
    )


def compute_categorical_metrics(
    forecasts: np.ndarray,
    references: np.ndarray,
    threshold_mm: float
) -> CategoricalMetrics:
    """
    Computes deterministic rainfall threshold classification metrics:
    POD = hits / (hits + misses)
    FAR = false_alarms / (hits + false_alarms)
    CSI = hits / (hits + misses + false_alarms)

    Zero denominators are handled explicitly by returning None rather than producing NaN silently.
    """
    if len(forecasts) == 0:
        return CategoricalMetrics(
            threshold_mm=threshold_mm,
            pod=None,
            far=None,
            csi=None,
            hits=0,
            misses=0,
            false_alarms=0,
            correct_negatives=0,
            total_samples=0
        )

    f_event = (forecasts >= threshold_mm)
    r_event = (references >= threshold_mm)

    hits = int(np.sum(f_event & r_event))
    misses = int(np.sum((~f_event) & r_event))
    false_alarms = int(np.sum(f_event & (~r_event)))
    correct_negatives = int(np.sum((~f_event) & (~r_event)))
    total_samples = len(forecasts)

    # Handle zero denominators explicitly
    pod = (hits / (hits + misses)) if (hits + misses) > 0 else None
    far = (false_alarms / (hits + false_alarms)) if (hits + false_alarms) > 0 else None
    csi = (hits / (hits + misses + false_alarms)) if (hits + misses + false_alarms) > 0 else None

    return CategoricalMetrics(
        threshold_mm=threshold_mm,
        pod=float(pod) if pod is not None else None,
        far=float(far) if far is not None else None,
        csi=float(csi) if csi is not None else None,
        hits=hits,
        misses=misses,
        false_alarms=false_alarms,
        correct_negatives=correct_negatives,
        total_samples=total_samples,
        metric_type="deterministic rainfall threshold metrics",
        disclaimer=(
            "categorical performance is deterministic threshold classification, "
            "not probabilistic exceedance forecasting or flood/landslide hazard threshold."
        )
    )
