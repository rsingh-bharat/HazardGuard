"""
Dedicated CLI runner for executing the historical meteorological benchmark
comparing ECMWF IFS vs WeatherNext 3 against ERA5 reference ground truth.
"""

from __future__ import annotations

import argparse
import sys
import json
from datetime import datetime, timezone
from typing import List

from ml.benchmark.schema import BenchmarkConfig
from ml.benchmark.evaluator import BenchmarkEvaluator
from ml.benchmark.reporting import BenchmarkReportGenerator
from ml.benchmark_data.pipeline import BenchmarkDataPipeline


from ml.benchmark.integrity import parse_utc_datetime


def run_benchmark(
    lats: List[float],
    lons: List[float],
    start_date: str,
    end_date: str,
    lead_time_hours: float = 24.0,
    primary_threshold_mm: float = 64.5,
    bootstrap_resamples: int = 1000,
    bootstrap_seed: int = 42,
    reference_cutoff: str = None,
    output_json_path: str = None,
    output_report_path: str = None
):
    print("=" * 70)
    print("HAZARDGUARD HISTORICAL BENCHMARK: ECMWF IFS vs WeatherNext 3 vs ERA5")
    print("=" * 70)
    print(f"Target coordinates: {len(lats)} locations")
    print(f"Evaluation window candidate: {start_date} to {end_date}")
    print(f"Lead time: +{lead_time_hours}h (00Z to 00Z accumulation)")
    print(f"Primary deterministic threshold: {primary_threshold_mm} mm")
    print(f"Bootstrap resamples: {bootstrap_resamples} (seed: {bootstrap_seed})")

    # Enforce UTC timezone-aware cutoff: explicit cutoff > end_date bounded by now_utc
    now_utc = datetime.now(timezone.utc)
    if reference_cutoff:
        cutoff_dt = parse_utc_datetime(reference_cutoff)
    elif end_date:
        from datetime import timedelta
        end_dt = parse_utc_datetime(end_date) + timedelta(hours=lead_time_hours)
        cutoff_dt = min(end_dt, now_utc)
    else:
        cutoff_dt = now_utc

    print(f"Reference cutoff (UTC): {cutoff_dt.isoformat()}")
    print("-" * 70)

    # 1. Stream aligned dataset in discrete temporal chunks from pipeline (bounded memory)
    pipeline = BenchmarkDataPipeline()
    chunks = pipeline.iter_aligned_chunks(
        lats=lats,
        lons=lons,
        start_date=start_date,
        end_date=end_date,
        lead_time_hours=[lead_time_hours],
        chunk_days=30
    )

    # 2. Configure scoring evaluator with cutoff enforcement
    eval_end_dt = parse_utc_datetime(end_date) + timedelta(hours=lead_time_hours)
    config = BenchmarkConfig(
        evaluation_start=start_date,
        evaluation_end=eval_end_dt.isoformat(),
        lead_time_hours=lead_time_hours,
        primary_threshold_mm=primary_threshold_mm,
        bootstrap_resamples=bootstrap_resamples,
        bootstrap_seed=bootstrap_seed,
        require_complete_24h_windows=True,
        reference_cutoff_dt=cutoff_dt.isoformat(),
    )

    evaluator = BenchmarkEvaluator(config)
    result = evaluator.evaluate(chunks, reference_cutoff_dt=cutoff_dt)

    # 3. Generate human-readable report
    report_text = BenchmarkReportGenerator.generate_markdown_report(result)
    print("\n" + report_text + "\n")

    if output_json_path:
        with open(output_json_path, "w") as f:
            f.write(result.to_json(indent=2))
        print(f"Machine-readable JSON saved to: {output_json_path}")

    if output_report_path:
        with open(output_report_path, "w") as f:
            f.write(report_text)
        print(f"Human-readable Report saved to: {output_report_path}")

    return result


def main():
    parser = argparse.ArgumentParser(description="Run historical weather model benchmark.")
    parser.add_argument("--start-date", type=str, default="2026-01-01", help="Evaluation start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, default="2026-01-05", help="Evaluation end date (YYYY-MM-DD)")
    parser.add_argument("--lats", type=str, default="28.0", help="Comma-separated latitudes (e.g. 28.0)")
    parser.add_argument("--lons", type=str, default="77.0", help="Comma-separated longitudes (e.g. 77.0)")
    parser.add_argument("--lead-time", type=float, default=24.0, help="Lead time hours (default: 24.0)")
    parser.add_argument("--threshold", type=float, default=64.5, help="Deterministic rainfall threshold in mm (default: 64.5)")
    parser.add_argument("--resamples", type=int, default=1000, help="Bootstrap resamples (default: 1000)")
    parser.add_argument("--seed", type=int, default=42, help="Bootstrap random seed (default: 42)")
    parser.add_argument("--cutoff", type=str, default=None, help="Explicit cutoff ISO timestamp (default: derived from end-date)")
    parser.add_argument("--json-out", type=str, default=None, help="Path to save output JSON")
    parser.add_argument("--report-out", type=str, default=None, help="Path to save output Markdown report")

    args = parser.parse_args()

    lats = [float(x.strip()) for x in args.lats.split(",")]
    lons = [float(x.strip()) for x in args.lons.split(",")]

    run_benchmark(
        lats=lats,
        lons=lons,
        start_date=args.start_date,
        end_date=args.end_date,
        lead_time_hours=args.lead_time,
        primary_threshold_mm=args.threshold,
        bootstrap_resamples=args.resamples,
        bootstrap_seed=args.seed,
        reference_cutoff=args.cutoff,
        output_json_path=args.json_out,
        output_report_path=args.report_out
    )


if __name__ == "__main__":
    main()

