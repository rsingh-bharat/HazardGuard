# HazardGuard Authoritative Training Data Manifest

**Author:** Sayan (Scientific ML Subsystem Lead)  
**Recipient:** Ronak (Integration Architect) / ML Research & Reproduction Engineers  
**Generated:** 2026-09-03  
**Status:** COMPLETE & CHECKSUM-VERIFIED  

---

## 1. Executive Summary & Provenance Trace

This document records the exact provenance trace for the authoritative deployed machine learning models in HazardGuard SIH26080, in particular the operational **+24h Residual XGBoost Bias Corrector** (`hazardguard_v7_24h` / `ml/models/candidates/24h_residual.json`).

### Provenance Chain Summary
1. **Raw Historical Meteorological Inputs:** ECMWF IFS-025 previous run forecasts matched against ERA5 / IMD reference precipitation across 69 Indian grid points.
2. **Intermediate Dataset:** `final_historical_dataset.parquet` (621,451 bytes) containing previous runs and reference precipitation.
3. **Feature Augmentation Script:** `ml/data/builder_v7.py` fetched historical previous-day wind variables ($u, v$ components) via Open-Meteo previous runs API.
4. **Authoritative Master Dataset:** `dataset_v7_corrected.parquet` (1,229,891 bytes, SHA-256: `e0bc0aff14b1c441bd41f87978ada6246e263e26fd090eb50546b13703e382a0`).
5. **Authoritative Training Script:** `ml/train_final.py` evaluated all lead times (+24h, +48h, +72h) across RAW, Residual, Direct, and TwoStage models, enforcing deployment gates and generating `ml/models/model_registry.json`.
6. **Active Deployed Model Artifact:** `ml/models/candidates/24h_residual.json` (538,286 bytes, SHA-256: `dbe2a46cd05221ab98fb54484a65a10951e39d914cd3815d05d26993bbb6f816`).

---

## 2. Dataset Inventory

| Field | Dataset 1 (PRIMARY REQUIRED) | Dataset 2 (INTERMEDIATE PROVENANCE) | Dataset 3 (HISTORICAL CONTEXT) |
|---|---|---|---|
| **Logical Name** | `Authoritative V7 Corrected Dataset` | `Final Historical Baseline Dataset` | `Serious Models Prototype Dataset` |
| **Original Location** | `D:\HazardGuard-ML\datasets\dataset_v7_corrected.parquet` | `D:\HazardGuard-ML\datasets\final_historical_dataset.parquet` | `C:\Users\Lenovo\Hazard-guard\ml\data\cache\serious_training_data.parquet` |
| **Transfer Package Path** | `training_data/dataset_v7_corrected.parquet` | `training_data/final_historical_dataset.parquet` | `training_data/serious_training_data.parquet` |
| **Classification** | `REQUIRED_FOR_REPRODUCTION` | `OPTIONAL_CONTEXT` | `HISTORICAL` |
| **Runtime Status** | `NOT_RUNTIME_REQUIRED` | `NOT_RUNTIME_REQUIRED` | `NOT_RUNTIME_REQUIRED` |
| **Models Dependent** | `hazardguard_v7_24h` (`24h_residual.json`), benchmark metrics for +48h & +72h | Precursor to `builder_v7.py` | Early benchmark prototype (`train_serious_models.py`) |
| **File Size** | 1,229,891 bytes (1.17 MB) | 621,451 bytes (0.59 MB) | 137,889 bytes (0.13 MB) |
| **SHA-256 Checksum** | `e0bc0aff14b1c441bd41f87978ada6246e263e26fd090eb50546b13703e382a0` | `7bcd06521a205bc64f88c49c5b440ff6ee1e492bd599b71c87ed505bd052f53b` | `7339939de23f1dd1cda623a4849247cf4fad649d90d954041fd30faec995b408` |
| **Row Count** | 35,190 rows (11,730 per lead) | 35,190 rows | 5,900 rows |
| **Valid Time Range** | `2024-03-14T00:00:00Z` to `2024-08-30T00:00:00Z` | `2024-03-14T00:00:00Z` to `2024-08-30T00:00:00Z` | `2026-06-01` to `2026-08-31` |
| **Geographic Scope** | India domain: Lat 8.5 to 34.3 N, Lon 71.93 to 93.9 E (69 grid stations) | India domain: Lat 8.5 to 34.3 N, Lon 71.93 to 93.9 E (69 grid stations) | India domain (sub-sample) |
| **Lead Times** | +24h, +48h, +72h | +24h, +48h, +72h | Single lead |
| **Target Variable** | `reference_precip_mm` | `reference_precip_mm` | `observed_precip_mm` |
| **Key Features** | `forecast_precip_mm`, `forecast_temperature`, `forecast_relative_humidity`, `forecast_surface_pressure`, `wind_u`, `wind_v`, `forecast_cloud_cover`, `sin_day_of_year`, `cos_day_of_year`, `latitude`, `longitude` | Same without $u, v$ vector decomposition | Single lead atmospheric variables |
| **Producing Script** | `ml/data/builder_v7.py` | `ml/data/builder_v6.py` | `ml/data/build_serious_dataset.py` |
| **Training Script** | `ml/train_final.py` | `ml/train_v3.py` | `ml/train_serious_models.py` |

---

## 3. Split Configuration for the Authoritative +24h Model

The authoritative model registry (`ml/models/model_registry.json`) records the exact row counts for the +24h lead time partition (`lead_time_hours == 24.0`):

| Split Name | Date Range Condition | Row Count | Purpose |
|---|---|---|---|
| **Train Set** | `valid_time < "2024-07-01"` | **7,521** | Optimization of tree structures and weights ($w=3.0$ for heavy events). |
| **Validation Set** | `"2024-07-01" <= valid_time < "2024-08-01"` | **2,139** | Early stopping (30 rounds) and hyperparameter selection. |
| **Independent Test Set** | `valid_time >= "2024-08-01"` | **2,070** | Final un-tuned evaluation metrics published in `model_registry.json`. |
| **Total (+24h)** | Full temporal range | **11,730** | Exactly 1/3 of the 35,190 rows in `dataset_v7_corrected.parquet`. |

---

## 4. Hyperparameter Specifications for Reproduction

* **Script:** `ml/train_final.py`
* **Algorithm:** XGBoost Booster (`xgb.train`)
* **Tree Method:** `hist` (GPU accelerated with `device: cuda` or fallback to CPU)
* **Objective:** `reg:squarederror` on transformed target
* **Target Transformation:** Residual ($\log(1 + y_{\text{obs}}) - \log(1 + y_{\text{nwp}})$)
* **Max Depth:** 5
* **Learning Rate ($\eta$):** 0.05
* **Subsample Ratio:** 0.8
* **Column Subsample by Tree:** 0.8
* **Random Seed:** 42
* **Sample Weighting:** $w = 3.0$ for observations with $y_{\text{obs}} \ge 15.6\text{ mm}$, $1.0$ otherwise
* **Max Boost Rounds:** 600 (with early stopping rounds = 30 evaluated on validation set)

---

## 5. Reproduction Instruction

To reproduce the exact model and registry entry from the transfer package:
```powershell
# From repository root with dataset_v7_corrected.parquet in place
.\.venv-ml\Scripts\python.exe ml/train_final.py
```
