import pytest
import json
from datetime import datetime, timezone
from ml.benchmark_data.schema import BenchmarkObservation
from ml.benchmark.schema import BenchmarkConfig, BenchmarkResult
from ml.benchmark.evaluator import BenchmarkEvaluator
from ml.benchmark.reporting import BenchmarkReportGenerator


def _build_synthetic_dataset():
    """Builds a multi-day synthetic dataset with consistent vintages and complete 24h windows."""
    observations = []
    dates = ["2026-01-01", "2026-01-02", "2026-01-03"]
    cells = [("grid_28_77", 28.0, 77.0), ("grid_2825_77", 28.25, 77.0)]

    for d_idx, d in enumerate(dates):
        init_t = f"{d}T00:00:00Z"
        valid_t = f"2026-01-0{d_idx+2}T00:00:00Z"
        for gid, lat, lon in cells:
            obs = BenchmarkObservation(
                forecast_provider="weathernext3_statistics",
                model_id="weathernext_3_0_0_statistics",
                run_id=f"wn3_run_{d}",
                init_time=init_t,
                valid_time=valid_t,
                lead_time_hours=24.0,
                latitude=lat,
                longitude=lon,
                grid_id=gid,
                rainfall_mm_24h=15.0 + d_idx * 10.0,
                reference_rainfall_mm_24h=14.0 + d_idx * 10.0,
                regridding_method="conservative_remapping_0.1_to_0.25",
                accumulation_method="24h_sum_00Z_to_00Z",
                source_metadata={
                    "ecmwf_rainfall_mm_24h": 12.0 + d_idx * 10.0,
                    "ecmwf_init_time": init_t,
                    "ecmwf_lead_time_hours": 24.0,
                    "ecmwf_run_id": f"ec_run_{d}"
                }
            )
            observations.append(obs)
    return observations


def test_probabilistic_benchmark_strictly_disabled():
    config = BenchmarkConfig(
        lead_time_hours=24.0,
        primary_threshold_mm=64.5,
        bootstrap_resamples=50
    )
    evaluator = BenchmarkEvaluator(config)
    dataset = _build_synthetic_dataset()

    result = evaluator.evaluate(dataset)

    # 1. Flag must be strictly False
    assert result.probabilistic_benchmark_available is False

    # 2. Output dictionary and JSON must not contain probabilistic metrics
    res_dict = result.to_dict()
    assert res_dict["probabilistic_benchmark_available"] is False

    forbidden_keys = ["crps", "brier", "reliability", "quantile", "percentile_probability"]
    # Check metrics and categorical results dicts
    metrics_str = json.dumps({
        "metrics": res_dict["metrics"],
        "categorical_metrics": res_dict["categorical_metrics"],
        "statistical_comparison": res_dict["statistical_comparison"]
    }).lower()
    for f_key in forbidden_keys:
        assert f_key not in metrics_str, f"Forbidden probabilistic metric '{f_key}' found in scoring output!"


def test_provenance_preservation():
    config = BenchmarkConfig(
        lead_time_hours=24.0,
        primary_threshold_mm=64.5,
        reference_source="era5",
        target_grid="0.25_degree_regular_lat_lon"
    )
    evaluator = BenchmarkEvaluator(config)
    dataset = _build_synthetic_dataset()

    result = evaluator.evaluate(dataset)

    prov = result.provenance
    assert prov["reference_source"] == "era5"
    assert prov["target_grid"] == "0.25_degree_regular_lat_lon"
    assert prov["lead_time_hours"] == 24.0
    assert prov["primary_threshold_mm"] == 64.5
    assert prov["models"]["ecmwf"] == "ecmwf_ifs"
    assert prov["models"]["weathernext"] == "weathernext_3_0_0_statistics"
    assert prov["models"]["reference"] == "era5_reanalysis"
    assert "grid_cells" in prov
    assert "regridding_method" in prov
    assert "accumulation_method" in prov


def test_strict_missing_data_rejection():
    config = BenchmarkConfig(lead_time_hours=24.0)
    evaluator = BenchmarkEvaluator(config)

    dataset = _build_synthetic_dataset()
    # Add record with missing reference rainfall (-1.0 placeholder)
    corrupted_obs = BenchmarkObservation(
        forecast_provider="weathernext3_statistics",
        model_id="wn3", run_id="r_bad",
        init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
        lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="bad_grid",
        rainfall_mm_24h=10.0, reference_rainfall_mm_24h=-1.0, # Negative indicates missing
        source_metadata={"ecmwf_rainfall_mm_24h": 10.0, "ecmwf_init_time": "2026-01-01T00:00:00Z"}
    )
    dataset.append(corrupted_obs)

    # Initial valid records = 6 (3 dates * 2 cells)
    result = evaluator.evaluate(dataset)
    assert result.sample_count == 6  # The corrupted one was dropped, not imputed or zero-filled!
    assert result.coverage_statistics.rejected_vintage_records >= 1


def test_report_generation_contract():
    config = BenchmarkConfig(
        lead_time_hours=24.0,
        primary_threshold_mm=64.5,
        bootstrap_resamples=100,
        bootstrap_seed=42
    )
    evaluator = BenchmarkEvaluator(config)
    dataset = _build_synthetic_dataset()

    result = evaluator.evaluate(dataset)
    report = BenchmarkReportGenerator.generate_markdown_report(result)

    # Required sections A through J
    assert "## A. Evaluation Period" in report
    assert "## B. Coverage" in report
    assert "## C. Primary Deterministic Metrics" in report
    assert "## D. Deterministic Rainfall Threshold Metrics" in report
    assert "## E. Statistical Comparison" in report
    assert "## F. Probabilistic Benchmark Status" in report
    assert "## G. Scientific Limitations" in report
    assert "## H. Data Provenance" in report

    # Required disclaimers and terminology
    assert "probabilistic_benchmark_available = false" in report
    assert "deterministic rainfall threshold metrics" in report
    assert "Neither model is declared an overall winner" in report


def test_deterministic_repeatability():
    config = BenchmarkConfig(bootstrap_resamples=200, bootstrap_seed=42)
    evaluator = BenchmarkEvaluator(config)
    dataset = _build_synthetic_dataset()

    res1 = evaluator.evaluate(dataset).to_dict()
    res2 = evaluator.evaluate(dataset).to_dict()

    # Compare metrics, stats, categorical
    assert res1["metrics"] == res2["metrics"]
    assert res1["categorical_metrics"] == res2["categorical_metrics"]
    assert res1["statistical_comparison"] == res2["statistical_comparison"]
    assert res1["sample_count"] == res2["sample_count"]
