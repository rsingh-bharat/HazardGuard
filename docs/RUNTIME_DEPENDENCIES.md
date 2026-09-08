# HazardGuard Scientific ML Runtime Dependencies

**Subsystem:** HazardGuard Scientific ML Microservice  
**Python Runtime:** Python 3.12 (64-bit) — Verified on Python 3.12.8  

---

## 1. Runtime vs Training Dependencies

To ensure clean isolation, dependencies are categorized into two groups:

### Group A: Runtime Inference Dependencies (Mandatory for Ronak)
These packages are strictly required to start the FastAPI server, load XGBoost models, compute ensemble metrics, and serve all 4 endpoints:

| Package | Minimum Version | Verified Active Version | Purpose |
|---|---|---|---|
| `fastapi` | `>= 0.110.0` | `0.141.1` | Asynchronous REST API framework. |
| `uvicorn` | `>= 0.29.0` | `0.52.4` | High-performance ASGI web server. |
| `pydantic` | `>= 2.7.0` | `2.13.5` | Data validation, contract typing, and serialization. |
| `xgboost` | `>= 2.1.0` | `3.4.1` | Evaluating +24h residual bias corrector model (`24h_residual.json`). |
| `pandas` | `>= 2.2.0` | `3.0.5` | In-memory feature dataframe manipulation. |
| `numpy` | `>= 2.0.0` | `2.5.2` | Numerical calculations, vector transformations, and bounds checking. |
| `scipy` | `>= 1.13.0` | `1.18.1` | Scientific statistics and distributions. |
| `requests` | `>= 2.31.0` | `2.34.2` | Upstream NWP provider HTTP API communication. |
| `pytest` | `>= 8.0.0` | `9.1.1` | Automated regression test execution. |
| `httpx` | `>= 0.27.0` | `0.28.1` | FastAPI `TestClient` test runner execution. |

### Group B: Storage & Training-Time Dependencies (Excluded from Runtime)
These packages were used during offline dataset building, ERA5 ingestion, and historical model training. **They are NOT required for runtime inference**:

| Package | Purpose during Training | Runtime Necessity |
|---|---|---|
| `xarray` | Multi-dimensional netCDF/Zarr processing of reanalysis archives. | Not needed for inference. |
| `zarr` | Chunked tensor storage on Drive D:. | Not needed for inference. |
| `gcsfs` | Google Cloud Storage ingestion for WeatherNext benchmarks. | Not needed for inference. |
| `dask` | Distributed computing across multi-gigabyte training files. | Not needed for inference. |
| `scikit-learn` | Historical training metrics and cross-validation splitting. | Not needed for inference (XGBoost uses native C API). |
| `pyarrow` | Reading large historical parquet training caches. | Not needed for inference. |

---

## 2. Setting Up the Runtime Environment

If Ronak or a deployment engineer is setting up a fresh environment from scratch:

```powershell
# 1. Create a fresh Python 3.12 virtual environment
python -m venv .venv-ml

# 2. Activate virtual environment
.\.venv-ml\Scripts\Activate.ps1

# 3. Upgrade pip
python -m pip install --upgrade pip

# 4. Install runtime dependencies
pip install -r requirements-ml.txt
```

---

## 3. Verifying the Runtime Environment

Run this one-liner to verify all runtime imports:
```powershell
.\.venv-ml\Scripts\python.exe -c "import fastapi, uvicorn, pydantic, xgboost, pandas, numpy, scipy, requests; print('All core runtime dependencies verified successfully!')"
```
