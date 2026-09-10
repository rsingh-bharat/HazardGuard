from __future__ import annotations

from typing import Dict, Any, List
from ml.benchmark.schema import BenchmarkResult


class BenchmarkReportGenerator:
    """
    Generates structured, human-readable markdown and plain text audit reports
    from a BenchmarkResult.
    """

    @staticmethod
    def generate_markdown_report(result: BenchmarkResult) -> str:
        res = result.to_dict()
        cov = res["coverage_statistics"]
        met = res["metrics"]
        cat = res["categorical_metrics"]
        stat = res["statistical_comparison"]
        prov = res["provenance"]

        lines = [
            f"# Historical Meteorological Benchmark Report: ECMWF vs WeatherNext 3",
            f"",
            f"**Benchmark ID**: `{result.benchmark_id}`  ",
            f"**Reference Ground Truth**: `{result.reference_source.upper()} Reanalysis`  ",
            f"**Target Grid**: `{result.grid}`  ",
            f"**Accumulation Window**: `{result.accumulation_window_hours:.0f}-hour accumulation (00Z to 00Z)`  ",
            f"",
            f"---",
            f"",
            f"## A. Evaluation Period & Temporal Coverage",
            f"",
            f"* **Evaluation Window Start**: `{result.evaluation_start}`",
            f"* **Evaluation Window End**: `{result.evaluation_end}`",
            f"* **Complete 24-Hour Windows Evaluated**: `{result.number_of_complete_windows}`",
            f"* **Total Aligned Benchmark Observations**: `{result.sample_count:,}` records",
            f"",
            f"---",
            f"",
            f"## B. Coverage & Missing Data Handling",
            f"",
            f"Strict intersection was enforced across ECMWF, WeatherNext, and ERA5. "
            f"No forward filling, spatial interpolation, or synthetic imputation was permitted.",
            f"",
            f"| Metric | Count |",
            f"| :--- | :--- |",
            f"| Initial Aligned Candidates | `{cov['aligned_records']:,}` |",
            f"| Rejected Vintage Mismatches | `{cov['rejected_vintage_records']:,}` |",
            f"| Rejected Incomplete Windows | `{cov['rejected_incomplete_window_records']:,}` |",
            f"| Retained Benchmark Records | `{cov['retained_benchmark_records']:,}` |",
            f"| Complete 24h Windows | `{cov['number_of_complete_windows']}` |",
            f"| Expected 24h Windows | `{cov.get('expected_windows', cov['number_of_complete_windows'])}` |",
            f"| Missing 24h Windows | `{len(cov.get('missing_windows', []))}` |",
            f"| Coverage Ratio | `{cov.get('coverage_ratio', 1.0) * 100:.1f}%` |",
            f"| Coverage Status | `{cov.get('coverage_status', 'complete')}` |",
            f"",
            f"---",
            f"",
            f"## C. Primary Deterministic Metrics (Continuous Verification)",
            f"",
            f"### 1. Overall Pooled Records",
            f"Computed across all spatial grid cells and valid times combined (N = {result.sample_count:,}).",
            f"",
            f"| Metric | ECMWF IFS | WeatherNext 3 | Difference (WN3 - ECMWF) |",
            f"| :--- | :--- | :--- | :--- |",
        ]

        def fmt_val(v, prec=3):
            return f"{v:.{prec}f}" if v is not None else "N/A"

        ec_pooled = met.get("ecmwf", {}).get("pooled", {})
        wn_pooled = met.get("weathernext", {}).get("pooled", {})

        for m_name, label, unit in [
            ("mae", "MAE", "mm"),
            ("rmse", "RMSE", "mm"),
            ("mbe", "Mean Bias Error (MBE)", "mm"),
            ("pearson_r", "Pearson Correlation (r)", ""),
        ]:
            v_ec = ec_pooled.get(m_name)
            v_wn = wn_pooled.get(m_name)
            diff_str = fmt_val(v_wn - v_ec) if (v_wn is not None and v_ec is not None) else "N/A"
            unit_suffix = f" {unit}" if unit else ""
            lines.append(
                f"| {label} | {fmt_val(v_ec)}{unit_suffix} | {fmt_val(v_wn)}{unit_suffix} | {diff_str}{unit_suffix} |"
            )

        lines.extend([
            f"",
            f"### 2. Spatial Aggregation (Per-Grid-Cell Across Time)",
            f"Evaluates time-series performance independently at each grid cell, then summarizes across space.",
            f"",
            f"| Metric | ECMWF (Mean / Median) | WeatherNext 3 (Mean / Median) | Grid Cells Evaluated |",
            f"| :--- | :--- | :--- | :--- |",
        ])

        ec_spat = met.get("ecmwf", {}).get("spatial", {})
        wn_spat = met.get("weathernext", {}).get("spatial", {})
        n_cells = ec_spat.get("num_grid_cells", 0)

        for m_name, label in [
            ("mae", "MAE (mm)"),
            ("rmse", "RMSE (mm)"),
            ("mbe", "MBE (mm)"),
            ("pearson_r", "Pearson r"),
        ]:
            mean_ec = ec_spat.get(f"mean_{m_name}")
            med_ec = ec_spat.get(f"median_{m_name}", mean_ec)
            mean_wn = wn_spat.get(f"mean_{m_name}")
            med_wn = wn_spat.get(f"median_{m_name}", mean_wn)

            ec_str = f"{fmt_val(mean_ec)} / {fmt_val(med_ec)}" if mean_ec is not None else "N/A"
            wn_str = f"{fmt_val(mean_wn)} / {fmt_val(med_wn)}" if mean_wn is not None else "N/A"
            lines.append(f"| {label} | {ec_str} | {wn_str} | {n_cells} |")

        lines.extend([
            f"",
            f"### 3. Temporal Aggregation (Per-Valid-Time Across Space)",
            f"Evaluates spatial forecast fields independently at each valid date, then summarizes across time.",
            f"",
            f"| Metric | ECMWF (Mean / Median) | WeatherNext 3 (Mean / Median) | Time Steps Evaluated |",
            f"| :--- | :--- | :--- | :--- |",
        ])

        ec_temp = met.get("ecmwf", {}).get("temporal", {})
        wn_temp = met.get("weathernext", {}).get("temporal", {})
        n_times = ec_temp.get("num_time_steps", 0)

        for m_name, label in [
            ("mae", "MAE (mm)"),
            ("rmse", "RMSE (mm)"),
            ("mbe", "MBE (mm)"),
            ("pearson_r", "Pearson r"),
        ]:
            mean_ec = ec_temp.get(f"mean_{m_name}")
            med_ec = ec_temp.get(f"median_{m_name}", mean_ec)
            mean_wn = wn_temp.get(f"mean_{m_name}")
            med_wn = wn_temp.get(f"median_{m_name}", mean_wn)

            ec_str = f"{fmt_val(mean_ec)} / {fmt_val(med_ec)}" if mean_ec is not None else "N/A"
            wn_str = f"{fmt_val(mean_wn)} / {fmt_val(med_wn)}" if mean_wn is not None else "N/A"
            lines.append(f"| {label} | {ec_str} | {wn_str} | {n_times} |")

        lines.extend([
            f"",
            f"---",
            f"",
            f"## D. Deterministic Rainfall Threshold Metrics",
            f"",
            f"> [!NOTE]",
            f"> These categorical results represent **deterministic rainfall threshold metrics** "
            f"> evaluating whether accumulated 24-hour mean precipitation reached a deterministic threshold. "
            f"> They do **NOT** represent flood/landslide hazard thresholds or probabilistic exceedance forecasts.",
            f"",
            f"| Threshold | Metric | ECMWF IFS | WeatherNext 3 | Hits (EC/WN) | Misses (EC/WN) | False Alarms (EC/WN) |",
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ])

        for thresh_key, t_data in cat.items():
            ec_c = t_data.get("ecmwf", {})
            wn_c = t_data.get("weathernext", {})

            for m_key, m_label in [("csi", "CSI"), ("pod", "POD"), ("far", "FAR")]:
                lines.append(
                    f"| {thresh_key} | {m_label} | "
                    f"{fmt_val(ec_c.get(m_key))} | "
                    f"{fmt_val(wn_c.get(m_key))} | "
                    f"{ec_c.get('hits', 0)} / {wn_c.get('hits', 0)} | "
                    f"{ec_c.get('misses', 0)} / {wn_c.get('misses', 0)} | "
                    f"{ec_c.get('false_alarms', 0)} / {wn_c.get('false_alarms', 0)} |"
                )

        lines.extend([
            f"",
            f"---",
            f"",
            f"## E. Statistical Comparison & Paired Block Bootstrap",
            f"",
            f"Bootstrap comparison resampled **whole 24-hour daily forecast blocks** "
            f"with replacement to preserve spatial autocorrelation across grid cells. "
            f"Points from the same date are clustered together.",
            f"",
            f"| Metric | ECMWF Score | WN3 Score | Difference (WN3 - EC) | 95% Confidence Interval | p-value | Resamples |",
            f"| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ])

        for s_key, s_data in stat.items():
            m_label = s_key.upper()
            ec_sc = fmt_val(s_data.get("ecmwf_score"))
            wn_sc = fmt_val(s_data.get("weathernext_score"))
            diff_sc = fmt_val(s_data.get("difference"))
            ci_l = s_data.get("ci_lower")
            ci_u = s_data.get("ci_upper")
            ci_str = f"[{fmt_val(ci_l)}, {fmt_val(ci_u)}]" if (ci_l is not None and ci_u is not None) else "N/A"
            p_val = s_data.get("p_value")
            p_str = f"{p_val:.4f}" if p_val is not None else "N/A"
            n_res = s_data.get("bootstrap_resamples", 0)

            lines.append(
                f"| {m_label} | {ec_sc} | {wn_sc} | {diff_sc} | {ci_str} | {p_str} | {n_res} |"
            )

        lines.extend([
            f"",
            f"---",
            f"",
            f"## F. Probabilistic Benchmark Status",
            f"",
            f"> [!IMPORTANT]",
            f"> **WeatherNext 3 probabilistic scoring is unavailable (`probabilistic_benchmark_available = false`).**  ",
            f"> Neither CRPS, Brier score, reliability diagrams, nor cumulative quantile exceedances were calculated. "
            f"> No numerical probability was generated or inferred.",
            f"",
            f"---",
            f"",
            f"## G. Scientific Limitations & Audit Disclaimers",
            f"",
        ])

        for lim in result.limitations:
            lines.append(f"* {lim}")

        lines.extend([
            f"",
            f"---",
            f"",
            f"## H. Data Provenance",
            f"",
            f"* **Evaluation Timestamp (UTC)**: `{prov.get('evaluation_created_at_utc', 'N/A')}`",
            f"* **Regridding Method**: `{prov.get('regridding_method', 'N/A')}`",
            f"* **Accumulation Method**: `{prov.get('accumulation_method', 'N/A')}`",
            f"* **Lead Time**: `{prov.get('lead_time_hours', 24.0)} hours`",
            f"* **Primary Threshold**: `{prov.get('primary_threshold_mm', 64.5)} mm`",
            f"* **Bootstrap Random Seed**: `{prov.get('bootstrap_seed', 42)}`",
            f"* **Evaluated Grid Cells (sample)**: `{', '.join(prov.get('grid_cells', []))}`",
            f"",
            f"*(Scientific disclaimer: Neither model is declared an overall winner. "
            f"Deterministic metrics provide complementary insights into bias, error dispersion, and threshold classification skill.)*",
        ])

        return "\n".join(lines)
