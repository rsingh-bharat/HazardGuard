from __future__ import annotations

from typing import List, Dict, Optional, Any
from collections import defaultdict
from datetime import datetime
import numpy as np

from ml.benchmark.schema import BenchmarkPairRecord, StatisticalComparisonResult
from ml.benchmark.integrity import parse_utc_datetime
from ml.benchmark.metrics import compute_mae, compute_rmse, compute_mbe


def _compute_csi_scalar(forecasts: np.ndarray, references: np.ndarray, threshold_mm: float) -> Optional[float]:
    """Helper to compute scalar CSI for bootstrap iterations."""
    f_event = (forecasts >= threshold_mm)
    r_event = (references >= threshold_mm)
    hits = int(np.sum(f_event & r_event))
    misses = int(np.sum((~f_event) & r_event))
    false_alarms = int(np.sum(f_event & (~r_event)))
    denom = hits + misses + false_alarms
    if denom == 0:
        return None
    return float(hits / denom)


def run_paired_daily_block_bootstrap(
    records: List[BenchmarkPairRecord],
    metric_name: str,
    threshold_mm: Optional[float] = None,
    resamples: int = 1000,
    seed: int = 42,
    confidence_level: float = 0.95
) -> StatisticalComparisonResult:
    """
    Executes a paired daily block bootstrap across 24-hour forecast periods.
    
    Spatial grid cells belonging to the same valid_time date are kept together
    as a single cluster, preventing spurious inflation of statistical significance
    due to spatial autocorrelation.
    
    Returns point estimates for ECMWF and WeatherNext, their difference (WeatherNext - ECMWF),
    bootstrap confidence interval, and empirical two-sided p-value.
    """
    metric_key = metric_name.lower().strip()
    
    # 1. Group records by valid_time calendar date (whole daily blocks)
    date_blocks = defaultdict(list)
    for r in records:
        d = parse_utc_datetime(r.valid_time).date()
        date_blocks[d].append(r)
        
    dates = sorted(date_blocks.keys())
    num_blocks = len(dates)
    
    # 2. Extract arrays for point estimates on the full dataset
    ecmwf_all = np.array([r.ecmwf_rainfall_mm_24h for r in records], dtype=np.float64)
    wn3_all = np.array([r.weathernext_rainfall_mm_24h for r in records], dtype=np.float64)
    ref_all = np.array([r.reference_rainfall_mm_24h for r in records], dtype=np.float64)

    def eval_metric(f: np.ndarray, r: np.ndarray) -> Optional[float]:
        if metric_key == "mae":
            return compute_mae(f, r)
        elif metric_key == "rmse":
            return compute_rmse(f, r)
        elif metric_key == "mbe":
            return compute_mbe(f, r)
        elif metric_key == "csi":
            if threshold_mm is None:
                raise ValueError("threshold_mm must be specified for CSI bootstrap comparison")
            return _compute_csi_scalar(f, r, threshold_mm)
        else:
            raise ValueError(f"Unsupported metric for statistical bootstrap: {metric_name}")

    point_ecmwf = eval_metric(ecmwf_all, ref_all)
    point_wn3 = eval_metric(wn3_all, ref_all)
    
    if point_ecmwf is None or point_wn3 is None:
        return StatisticalComparisonResult(
            metric_name=metric_name,
            ecmwf_score=point_ecmwf,
            weathernext_score=point_wn3,
            difference=None,
            ci_lower=None,
            ci_upper=None,
            confidence_level=confidence_level,
            p_value=None,
            bootstrap_resamples=resamples,
            random_seed=seed,
            block_type="daily_date_blocks",
            clustering_description="Insufficient data to compute point estimates."
        )

    point_diff = float(point_wn3 - point_ecmwf)

    # 3. Guard against insufficient daily blocks for resampling
    if num_blocks < 2:
        return StatisticalComparisonResult(
            metric_name=metric_name,
            ecmwf_score=point_ecmwf,
            weathernext_score=point_wn3,
            difference=point_diff,
            ci_lower=None,
            ci_upper=None,
            confidence_level=confidence_level,
            p_value=None,
            bootstrap_resamples=resamples,
            random_seed=seed,
            block_type="daily_date_blocks",
            clustering_description=(
                f"Only {num_blocks} daily block(s) available; at least 2 distinct dates required for bootstrap."
            )
        )

    # 4. Deterministic resampling with explicit NumPy generator
    rng = np.random.default_rng(seed)
    
    # Pre-extract arrays per block to optimize bootstrap iterations
    block_arrays = []
    for d in dates:
        recs = date_blocks[d]
        b_ec = np.array([r.ecmwf_rainfall_mm_24h for r in recs], dtype=np.float64)
        b_wn = np.array([r.weathernext_rainfall_mm_24h for r in recs], dtype=np.float64)
        b_ref = np.array([r.reference_rainfall_mm_24h for r in recs], dtype=np.float64)
        block_arrays.append((b_ec, b_wn, b_ref))

    diffs: List[float] = []

    # Draw indices with replacement: shape (resamples, num_blocks)
    sampled_indices = rng.choice(num_blocks, size=(resamples, num_blocks), replace=True)

    for b in range(resamples):
        idxs = sampled_indices[b]
        
        # Concatenate selected daily blocks
        cat_ec = np.concatenate([block_arrays[i][0] for i in idxs])
        cat_wn = np.concatenate([block_arrays[i][1] for i in idxs])
        cat_ref = np.concatenate([block_arrays[i][2] for i in idxs])

        score_ec = eval_metric(cat_ec, cat_ref)
        score_wn = eval_metric(cat_wn, cat_ref)

        if score_ec is not None and score_wn is not None:
            diffs.append(score_wn - score_ec)

    if not diffs:
        return StatisticalComparisonResult(
            metric_name=metric_name,
            ecmwf_score=point_ecmwf,
            weathernext_score=point_wn3,
            difference=point_diff,
            ci_lower=None,
            ci_upper=None,
            confidence_level=confidence_level,
            p_value=None,
            bootstrap_resamples=resamples,
            random_seed=seed,
            block_type="daily_date_blocks",
            clustering_description="All bootstrap resamples encountered undefined metric denominators."
        )

    diffs_arr = np.array(diffs, dtype=np.float64)

    # 5. Percentile confidence intervals
    alpha = 1.0 - confidence_level
    lower_pct = 100.0 * (alpha / 2.0)
    upper_pct = 100.0 * (1.0 - alpha / 2.0)

    ci_lower = float(np.percentile(diffs_arr, lower_pct))
    ci_upper = float(np.percentile(diffs_arr, upper_pct))

    # 6. Empirical two-sided p-value for H0: difference == 0
    # Proportion of resampled differences with opposite sign, doubled
    p_le_zero = np.mean(diffs_arr <= 0.0)
    p_ge_zero = np.mean(diffs_arr >= 0.0)
    p_val = float(min(1.0, 2.0 * min(p_le_zero, p_ge_zero)))

    return StatisticalComparisonResult(
        metric_name=metric_name,
        ecmwf_score=point_ecmwf,
        weathernext_score=point_wn3,
        difference=point_diff,
        ci_lower=ci_lower,
        ci_upper=ci_upper,
        confidence_level=confidence_level,
        p_value=p_val,
        bootstrap_resamples=len(diffs),
        random_seed=seed,
        block_type="daily_date_blocks",
        clustering_description=(
            f"Resampled {num_blocks} whole daily forecast dates with replacement ({len(diffs)} valid resamples). "
            f"Spatial cells on the same date kept together."
        )
    )
