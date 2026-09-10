from __future__ import annotations

import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone, timedelta
import numpy as np

from ml.benchmark_data.schema import BenchmarkObservation
from ml.benchmark.schema import (
    BenchmarkConfig,
    BenchmarkPairRecord,
    BenchmarkResult,
    CoverageStatistics,
)
from ml.benchmark.integrity import build_and_validate_pairs, parse_utc_datetime
from ml.benchmark.metrics import (
    compute_pooled_metrics,
    compute_spatial_metrics,
    compute_temporal_metrics,
    compute_categorical_metrics,
)
from ml.benchmark.statistics import run_paired_daily_block_bootstrap


class BenchmarkEvaluator:
    """
    Coordinates verification scoring, forecast-vintage validation,
    deterministic metrics, paired block bootstrap, and provenance generation.
    """

    def __init__(self, config: Optional[BenchmarkConfig] = None):
        self.config = config or BenchmarkConfig()

    def evaluate(
        self,
        observations: Any,
        reference_cutoff_dt: Optional[datetime] = None,
        raw_counts_before_intersection: Optional[Dict[str, int]] = None
    ) -> BenchmarkResult:
        """
        Runs full deterministic benchmark scoring on a list of candidate observations
        or an iterable/generator of chunked observation batches.
        """
        # Determine whether input is chunked or a single flat list
        if isinstance(observations, list):
            if len(observations) > 0 and isinstance(observations[0], list):
                chunk_iter = iter(observations)
            else:
                chunk_iter = iter([observations])
        else:
            # Generator or iterable of chunks
            chunk_iter = iter(observations)

        pairs: List[BenchmarkPairRecord] = []
        total_aligned = 0
        total_rejected_vintage = 0
        total_rejected_incomplete = 0
        raw_counts_agg = {"ecmwf": 0, "weathernext": 0, "era5": 0}

        for chunk in chunk_iter:
            if not chunk:
                continue
            c_pairs, c_stats = build_and_validate_pairs(
                aligned_observations=chunk,
                config=self.config,
                reference_cutoff_dt=reference_cutoff_dt,
                raw_counts_before_intersection=None
            )
            pairs.extend(c_pairs)
            total_aligned += c_stats.aligned_records
            total_rejected_vintage += c_stats.rejected_vintage_records
            total_rejected_incomplete += c_stats.rejected_incomplete_window_records
            for k in ("ecmwf", "weathernext", "era5"):
                raw_counts_agg[k] += c_stats.raw_records_before_intersection.get(k, 0)

        if raw_counts_before_intersection is not None:
            raw_counts_agg = raw_counts_before_intersection

        eval_start_dt = parse_utc_datetime(self.config.evaluation_start) if self.config.evaluation_start else None
        eval_end_dt = parse_utc_datetime(self.config.evaluation_end) if self.config.evaluation_end else None

        effective_cutoff_dt = reference_cutoff_dt
        if effective_cutoff_dt is None and self.config.reference_cutoff_dt:
            effective_cutoff_dt = parse_utc_datetime(self.config.reference_cutoff_dt)
        if effective_cutoff_dt is None and self.config.evaluation_end:
            effective_cutoff_dt = parse_utc_datetime(self.config.evaluation_end)

        if pairs:
            all_valid_dts = [parse_utc_datetime(p.valid_time) for p in pairs]
            actual_start_dt = min(all_valid_dts)
            actual_end_dt = max(all_valid_dts)
            actual_start_str = actual_start_dt.isoformat()
            actual_end_str = actual_end_dt.isoformat()
            unique_windows = set(p.valid_time for p in pairs)
            num_complete_windows = len(unique_windows)
            window_start = eval_start_dt if eval_start_dt is not None else actual_start_dt
            window_end = eval_end_dt if eval_end_dt is not None else actual_end_dt
        else:
            actual_start_str = self.config.evaluation_start or ""
            actual_end_str = self.config.evaluation_end or ""
            num_complete_windows = 0
            unique_windows = set()
            window_start = eval_start_dt
            window_end = eval_end_dt

        expected_windows_list: List[str] = []
        missing_windows: List[str] = []
        if window_start and window_end and window_start <= window_end:
            step_hours = self.config.lead_time_hours if self.config.lead_time_hours > 0 else 24.0
            curr_dt = window_start
            observed_iso_set = set(parse_utc_datetime(vt).isoformat() for vt in unique_windows)
            while curr_dt <= window_end:
                curr_iso = curr_dt.isoformat()
                expected_windows_list.append(curr_iso)
                if curr_iso not in observed_iso_set:
                    missing_windows.append(curr_iso)
                curr_dt += timedelta(hours=step_hours)

        expected_count = len(expected_windows_list)
        cov_ratio = (num_complete_windows / expected_count) if expected_count > 0 else (1.0 if num_complete_windows == 0 else 0.0)
        cov_status = "complete" if (expected_count > 0 and len(missing_windows) == 0) else ("coverage_incomplete" if expected_count > 0 else "empty")
        cutoff_str = effective_cutoff_dt.isoformat() if effective_cutoff_dt else None

        coverage_stats = CoverageStatistics(
            total_candidate_windows=expected_count if expected_count > 0 else num_complete_windows,
            raw_records_before_intersection=raw_counts_agg,
            aligned_records=total_aligned,
            rejected_vintage_records=total_rejected_vintage,
            rejected_incomplete_window_records=total_rejected_incomplete,
            retained_benchmark_records=len(pairs),
            number_of_complete_windows=num_complete_windows,
            evaluation_start=actual_start_str,
            evaluation_end=actual_end_str,
            expected_windows=expected_count,
            missing_windows=missing_windows,
            coverage_ratio=cov_ratio,
            coverage_status=cov_status,
            reference_cutoff_utc=cutoff_str,
        )

        sample_count = len(pairs)
        benchmark_id = f"bench_{uuid.uuid4().hex[:12]}"

        # If no valid pairs remain, return structured empty result
        if sample_count == 0:
            empty_limitations = [
                "No valid aligned observation pairs satisfied forecast-vintage integrity and complete 24h window constraints.",
                "WeatherNext 3 probabilistic scoring is unavailable (probabilistic_benchmark_available = false)."
            ]
            if missing_windows:
                empty_limitations.append(
                    f"Temporal coverage incomplete: {len(missing_windows)} of {expected_count} expected 24h windows missing."
                )
            return BenchmarkResult(
                benchmark_id=benchmark_id,
                evaluation_start=coverage_stats.evaluation_start,
                evaluation_end=coverage_stats.evaluation_end,
                number_of_complete_windows=0,
                providers=["ecmwf", "weathernext3_statistics"],
                reference_source=self.config.reference_source,
                grid=self.config.target_grid,
                accumulation_window_hours=self.config.lead_time_hours,
                sample_count=0,
                coverage_statistics=coverage_stats,
                metrics={"ecmwf": {}, "weathernext": {}},
                categorical_metrics={},
                statistical_comparison={},
                probabilistic_benchmark_available=False,
                provenance={
                    "regridding_method": self.config.regridding_method,
                    "accumulation_method": self.config.accumulation_method,
                    "target_grid": self.config.target_grid,
                    "reference_source": self.config.reference_source,
                    "reference_cutoff_utc": cutoff_str,
                },
                limitations=empty_limitations
            )

        # 2. Compute primary continuous deterministic metrics (Pooled, Spatial, Temporal)
        metrics: Dict[str, Any] = {
            "ecmwf": {
                "pooled": compute_pooled_metrics(pairs, "ecmwf").to_dict(),
                "spatial": compute_spatial_metrics(pairs, "ecmwf").to_dict(),
                "temporal": compute_temporal_metrics(pairs, "ecmwf").to_dict(),
            },
            "weathernext": {
                "pooled": compute_pooled_metrics(pairs, "weathernext").to_dict(),
                "spatial": compute_spatial_metrics(pairs, "weathernext").to_dict(),
                "temporal": compute_temporal_metrics(pairs, "weathernext").to_dict(),
            }
        }

        # 3. Categorical metrics (Deterministic rainfall threshold classification)
        # Primary threshold is 64.5 mm / 24h
        thresholds = [self.config.primary_threshold_mm]
        for t in self.config.additional_thresholds_mm:
            if t not in thresholds:
                thresholds.append(t)

        ecmwf_arr = np.array([r.ecmwf_rainfall_mm_24h for r in pairs], dtype=np.float64)
        wn3_arr = np.array([r.weathernext_rainfall_mm_24h for r in pairs], dtype=np.float64)
        ref_arr = np.array([r.reference_rainfall_mm_24h for r in pairs], dtype=np.float64)

        categorical_results: Dict[str, Dict[str, Any]] = {}
        for thresh in thresholds:
            t_key = f"{thresh:.1f}mm"
            categorical_results[t_key] = {
                "ecmwf": compute_categorical_metrics(ecmwf_arr, ref_arr, thresh).to_dict(),
                "weathernext": compute_categorical_metrics(wn3_arr, ref_arr, thresh).to_dict(),
            }

        # 4. Paired daily block bootstrap comparison
        stats_comp: Dict[str, Any] = {}
        for metric_name in ["mae", "rmse", "mbe"]:
            res = run_paired_daily_block_bootstrap(
                records=pairs,
                metric_name=metric_name,
                resamples=self.config.bootstrap_resamples,
                seed=self.config.bootstrap_seed,
                confidence_level=self.config.confidence_level
            )
            stats_comp[metric_name] = res.to_dict()

        # CSI statistical comparison at primary threshold 64.5 mm
        csi_res = run_paired_daily_block_bootstrap(
            records=pairs,
            metric_name="csi",
            threshold_mm=self.config.primary_threshold_mm,
            resamples=self.config.bootstrap_resamples,
            seed=self.config.bootstrap_seed,
            confidence_level=self.config.confidence_level
        )
        stats_comp[f"csi_{self.config.primary_threshold_mm:.1f}mm"] = csi_res.to_dict()

        # 5. Build Provenance Record
        unique_grids = sorted(list(set(r.grid_id for r in pairs)))
        unique_ecmwf_runs = sorted(list(set(r.ecmwf_run_id for r in pairs)))
        unique_wn3_runs = sorted(list(set(r.weathernext_run_id for r in pairs)))
        
        provenance: Dict[str, Any] = {
            "evaluation_created_at_utc": datetime.now(timezone.utc).isoformat(),
            "target_grid": self.config.target_grid,
            "regridding_method": self.config.regridding_method,
            "accumulation_method": self.config.accumulation_method,
            "reference_source": self.config.reference_source,
            "lead_time_hours": self.config.lead_time_hours,
            "primary_threshold_mm": self.config.primary_threshold_mm,
            "bootstrap_seed": self.config.bootstrap_seed,
            "bootstrap_resamples": self.config.bootstrap_resamples,
            "confidence_level": self.config.confidence_level,
            "grid_cell_count": len(unique_grids),
            "grid_cells": unique_grids[:10],  # Sample of grid cell IDs
            "models": {
                "ecmwf": "ecmwf_ifs",
                "weathernext": "weathernext_3_0_0_statistics",
                "reference": "era5_reanalysis"
            },
            "run_ids": {
                "ecmwf": unique_ecmwf_runs[:5],
                "weathernext": unique_wn3_runs[:5]
            }
        }

        # 6. Explicit Limitations Documentation
        limitations: List[str] = [
            "WeatherNext 3 probabilistic scoring is unavailable (probabilistic_benchmark_available = false). "
            "No ensemble quantiles, CRPS, Brier score, or reliability diagrams are computed.",
            "Deterministic rainfall threshold metrics evaluate point/grid classification skill, "
            "not flood/landslide impact thresholds or probabilistic exceedance forecasts.",
            "Spatial alignment uses conservative area-weighted remapping (0.1 deg to 0.25 deg) "
            "to preserve rainfall volume across grid boundaries.",
            "Statistical comparisons employ a paired daily block bootstrap to account for spatial autocorrelation across grid cells.",
            "Strict intersection was enforced with zero temporal forward filling, spatial interpolation, or synthetic imputation.",
            "Neither model is designated as an overall winner; verification provides multidimensional diagnostic evidence."
        ]

        if missing_windows:
            limitations.append(
                f"Temporal coverage incomplete: {len(missing_windows)} of {expected_count} expected 24h accumulation windows "
                f"were missing ({cov_ratio*100:.1f}% coverage). Missing windows: {', '.join(missing_windows[:5])}."
            )

        return BenchmarkResult(
            benchmark_id=benchmark_id,
            evaluation_start=coverage_stats.evaluation_start,
            evaluation_end=coverage_stats.evaluation_end,
            number_of_complete_windows=coverage_stats.number_of_complete_windows,
            providers=["ecmwf", "weathernext3_statistics"],
            reference_source=self.config.reference_source,
            grid=self.config.target_grid,
            accumulation_window_hours=self.config.lead_time_hours,
            sample_count=sample_count,
            coverage_statistics=coverage_stats,
            metrics=metrics,
            categorical_metrics=categorical_results,
            statistical_comparison=stats_comp,
            probabilistic_benchmark_available=False,
            provenance=provenance,
            limitations=limitations
        )
