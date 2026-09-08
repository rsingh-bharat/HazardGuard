# HazardGuard Storage Architecture & Drive Partitioning Layout

**Author:** Sayan  
**Target Audience:** Ronak, DevOps Engineers, Integration Architects  

---

## 1. The C: / D: Architectural Separation

HazardGuard was intentionally engineered with a strict **two-tier physical drive storage partition** due to workstation storage limits and the high volume of historical meteorological data:

```
[WORKSTATION HARDWARE]
  |
  +-- Drive C: (Primary SSD / High-Speed OS Drive)
  |     └── C:\Users\Lenovo\Hazard-guard\
  |           ├── Application Source Code & Repositories
  |           ├── Microservice API Layer (FastAPI)
  |           ├── Deployed ML Models (model_registry.json, 24h_residual.json)
  |           ├── Full Automated Test Suites (tests/ml/)
  |           ├── JSON Contract Samples (ml/contracts/samples/)
  |           └── Local Scratch Disk Caches (scratch/openmeteo_cache/)
  |
  +-- Drive D: (Secondary Bulk Storage HDD / NVMe Archive)
        └── D:\HazardGuard-ML\
              ├── Raw Multi-Year ERA5 / IMD Reanalysis Datasets
              ├── Chunked Zarr Ingestion Arrays
              ├── Multi-Gigabyte Parquet Feature Caches
              ├── Training Iteration Checkpoints & Model Backups
              └── Offline Training Experiment Logs
```

---

## 2. Drive C: — The Self-Contained Runtime System

Drive C: contains **everything needed for live operational inference, testing, and application integration**:

* **Path:** `C:\Users\Lenovo\Hazard-guard\`
* **Role:** Runtime Application, Microservice, Testing, and Deployment.
* **Key Components:**
  - `ml/api/main.py`: The FastAPI server.
  - `ml/model_loader.py`: The production model loader (resolves model paths relative to `__file__`).
  - `ml/models/model_registry.json`: Authoritative registry dictating model deployment and metrics.
  - `ml/models/candidates/24h_residual.json`: Validated +24h XGBoost model artifact (538 KB).
  - `tests/ml/`: 136 passing regression and integration tests.
  - `scratch/openmeteo_cache/`: Ephemeral network cache preventing redundant external API calls.

---

## 3. Drive D: — The Training & Research Archive

Drive D: is strictly an **offline training and data engineering repository**:

* **Path:** `D:\HazardGuard-ML\`
* **Role:** Historical Dataset Archive & Checkpoint Storage.
* **Contents:**
  - `datasets/`: Multi-decade IMD daily gridded rainfall netCDF files, ERA5 hourly reanalysis grids.
  - `checkpoints/`: Intermediate training checkpoints from hyperparameter sweeps.
  - `experiments/`: Offline validation logs and tuning runs.
  - `cache/`: Large-scale parquet feature tables.
  - `model_backups/`: Obsolete candidate models from training phases 1 through 6.

---

## 4. Key Rules for Ronak & Application Deployment

1. **Runtime Independence:**
   - **`D:\HazardGuard-ML` is NOT required for Ronak's application backend, frontend integration, or production serving.**
   - All runtime model loading, feature calculation, safety gating, and test suites execute with zero references to Drive D:.
2. **Never Copy or Mount Drive D: for Production:**
   - Production Docker images, VM instances, or deployment bundles must **never** copy or attempt to mount `D:\HazardGuard-ML`.
3. **Never Move or Reorganize Drive D: Locally:**
   - On the development machine, `D:\HazardGuard-ML` must remain untouched to ensure historical retraining pipelines remain reproducible.
