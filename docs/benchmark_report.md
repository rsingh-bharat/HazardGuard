# Historical Meteorological Benchmark Report: ECMWF vs WeatherNext 3

**Benchmark ID**: `bench_80f57b378f93`  
**Reference Ground Truth**: `ERA5 Reanalysis`  
**Target Grid**: `0.25_degree_regular_lat_lon`  
**Accumulation Window**: `24-hour accumulation (00Z to 00Z)`  

---

## A. Evaluation Period & Temporal Coverage

* **Evaluation Window Start**: `2026-01-02T00:00:00+00:00`
* **Evaluation Window End**: `2026-01-03T00:00:00+00:00`
* **Complete 24-Hour Windows Evaluated**: `2`
* **Total Aligned Benchmark Observations**: `8` records

---

## B. Coverage & Missing Data Handling

Strict intersection was enforced across ECMWF, WeatherNext, and ERA5. No forward filling, spatial interpolation, or synthetic imputation was permitted.

| Metric | Count |
| :--- | :--- |
| Initial Aligned Candidates | `8` |
| Rejected Vintage Mismatches | `0` |
| Rejected Incomplete Windows | `0` |
| Retained Benchmark Records | `8` |
| Complete 24h Windows | `2` |
| Expected 24h Windows | `3` |
| Missing 24h Windows | `1` |
| Coverage Ratio | `66.7%` |
| Coverage Status | `coverage_incomplete` |

---

## C. Primary Deterministic Metrics (Continuous Verification)

### 1. Overall Pooled Records
Computed across all spatial grid cells and valid times combined (N = 8).

| Metric | ECMWF IFS | WeatherNext 3 | Difference (WN3 - ECMWF) |
| :--- | :--- | :--- | :--- |
| MAE | 0.100 mm | 0.145 mm | 0.045 mm |
| RMSE | 0.283 mm | 0.214 mm | -0.069 mm |
| Mean Bias Error (MBE) | -0.100 mm | 0.030 mm | 0.130 mm |
| Pearson Correlation (r) | 0.108 | 0.599 | 0.492 |

### 2. Spatial Aggregation (Per-Grid-Cell Across Time)
Evaluates time-series performance independently at each grid cell, then summarizes across space.

| Metric | ECMWF (Mean / Median) | WeatherNext 3 (Mean / Median) | Grid Cells Evaluated |
| :--- | :--- | :--- | :--- |
| MAE (mm) | 0.100 / 0.000 | 0.145 / 0.144 | 4 |
| RMSE (mm) | 0.141 / 0.000 | 0.176 / 0.174 | 4 |
| MBE (mm) | -0.100 / -0.100 | 0.030 / 0.030 | 4 |
| Pearson r | 1.000 / 1.000 | 1.000 / 1.000 | 4 |

### 3. Temporal Aggregation (Per-Valid-Time Across Space)
Evaluates spatial forecast fields independently at each valid date, then summarizes across time.

| Metric | ECMWF (Mean / Median) | WeatherNext 3 (Mean / Median) | Time Steps Evaluated |
| :--- | :--- | :--- | :--- |
| MAE (mm) | 0.100 / 0.100 | 0.145 / 0.145 | 2 |
| RMSE (mm) | 0.200 / 0.200 | 0.176 / 0.176 | 2 |
| MBE (mm) | -0.100 / -0.100 | 0.030 / 0.030 | 2 |
| Pearson r | -0.088 / -0.088 | 0.449 / 0.449 | 2 |

---

## D. Deterministic Rainfall Threshold Metrics

> [!NOTE]
> These categorical results represent **deterministic rainfall threshold metrics** > evaluating whether accumulated 24-hour mean precipitation reached a deterministic threshold. > They do **NOT** represent flood/landslide hazard thresholds or probabilistic exceedance forecasts.

| Threshold | Metric | ECMWF IFS | WeatherNext 3 | Hits (EC/WN) | Misses (EC/WN) | False Alarms (EC/WN) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 64.5mm | CSI | N/A | N/A | 0 / 0 | 0 / 0 | 0 / 0 |
| 64.5mm | POD | N/A | N/A | 0 / 0 | 0 / 0 | 0 / 0 |
| 64.5mm | FAR | N/A | N/A | 0 / 0 | 0 / 0 | 0 / 0 |

---

## E. Statistical Comparison & Paired Block Bootstrap

Bootstrap comparison resampled **whole 24-hour daily forecast blocks** with replacement to preserve spatial autocorrelation across grid cells. Points from the same date are clustered together.

| Metric | ECMWF Score | WN3 Score | Difference (WN3 - EC) | 95% Confidence Interval | p-value | Resamples |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MAE | 0.100 | 0.145 | 0.045 | [0.044, 0.046] | 0.0000 | 1000 |
| RMSE | 0.283 | 0.214 | -0.069 | [-0.103, 0.055] | 0.5040 | 1000 |
| MBE | -0.100 | 0.030 | 0.130 | [0.046, 0.213] | 0.0000 | 1000 |
| CSI_64.5MM | N/A | N/A | N/A | N/A | N/A | 1000 |

---

## F. Probabilistic Benchmark Status

> [!IMPORTANT]
> **WeatherNext 3 probabilistic scoring is unavailable (`probabilistic_benchmark_available = false`).**  
> Neither CRPS, Brier score, reliability diagrams, nor cumulative quantile exceedances were calculated. > No numerical probability was generated or inferred.

---

## G. Scientific Limitations & Audit Disclaimers

* WeatherNext 3 probabilistic scoring is unavailable (probabilistic_benchmark_available = false). No ensemble quantiles, CRPS, Brier score, or reliability diagrams are computed.
* Deterministic rainfall threshold metrics evaluate point/grid classification skill, not flood/landslide impact thresholds or probabilistic exceedance forecasts.
* Spatial alignment uses conservative area-weighted remapping (0.1 deg to 0.25 deg) to preserve rainfall volume across grid boundaries.
* Statistical comparisons employ a paired daily block bootstrap to account for spatial autocorrelation across grid cells.
* Strict intersection was enforced with zero temporal forward filling, spatial interpolation, or synthetic imputation.
* Neither model is designated as an overall winner; verification provides multidimensional diagnostic evidence.
* Temporal coverage incomplete: 1 of 3 expected 24h accumulation windows were missing (66.7% coverage). Missing windows: 2026-01-01T00:00:00+00:00.

---

## H. Data Provenance

* **Evaluation Timestamp (UTC)**: `2026-09-05T19:47:11.585320+00:00`
* **Regridding Method**: `conservative_remapping_0.1_to_0.25`
* **Accumulation Method**: `24h_sum_00Z_to_00Z`
* **Lead Time**: `24.0 hours`
* **Primary Threshold**: `64.5 mm`
* **Bootstrap Random Seed**: `42`
* **Evaluated Grid Cells (sample)**: `grid_25.2500_90.2500, grid_25.2500_91.7500, grid_25.7500_90.2500, grid_25.7500_91.7500`

*(Scientific disclaimer: Neither model is declared an overall winner. Deterministic metrics provide complementary insights into bias, error dispersion, and threshold classification skill.)*