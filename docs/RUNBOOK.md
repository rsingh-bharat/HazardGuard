# HazardGuard Scientific ML Microservice: Operational Runbook

**Service Name:** HazardGuard Scientific ML Microservice  
**Entry Point:** `ml.api.main:app`  
**Runtime:** Python 3.12 (64-bit)  
**Default Port:** `8000`  

---

## 1. Runtime Setup & Starting the Service

### Prerequisites
* Python 3.12 virtual environment (e.g. `.\.venv-ml\`).
* Direct dependencies installed from `requirements-ml.txt`.
* Root repository directory: `C:\Users\Lenovo\Hazard-guard\`.

### Start the Microservice (Development / Integration)
From the repository root:
```powershell
$env:PYTHONPATH = "."
.\.venv-ml\Scripts\python.exe -m uvicorn ml.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Start the Microservice (Production / Background)
```powershell
$env:PYTHONPATH = "."
.\.venv-ml\Scripts\python.exe -m uvicorn ml.api.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Verify Service Health & API Documentation
Open in browser or test via curl:
* Swagger UI Docs: `http://localhost:8000/docs`
* OpenAPI Schema: `http://localhost:8000/openapi.json`

---

## 2. Multi-Lead Smoke Test Execution

Execute the verified multi-lead smoke test suite to confirm end-to-end functionality across all horizons:

```powershell
$env:PYTHONPATH = "."
.\.venv-ml\Scripts\python.exe -c "
from fastapi.testclient import TestClient
from ml.api.main import app
from ml.api.impact import ImpactRequest

client = TestClient(app)

for lead in [24, 48, 72]:
    print(f'=== Testing +{lead}h Horizon ===')
    r_fcst = client.post('/ml/forecast', json={'latitude': 25.467, 'longitude': 91.366, 'lead_time': lead})
    assert r_fcst.status_code == 200, r_fcst.text
    snap = r_fcst.json()
    print(f'  Forecast: status={snap[\"model_status\"]}, rainfall={snap[\"rainfall_mm\"]}mm, fallback={snap[\"fallback\"]}')
    
    r_prob = client.post('/ml/probability', json=snap)
    assert r_prob.status_code == 200, r_prob.text
    prob = r_prob.json()
    print(f'  Probability: p={prob[\"probability\"]}, cache={prob[\"ensemble_cache_status\"]}, quality={prob[\"ensemble_quality\"]}')
    
    r_verif = client.post('/ml/verification', json=snap)
    assert r_verif.status_code == 200, r_verif.text
    verif = r_verif.json()
    print(f'  Verification: status={verif[\"verification_status\"]}, RMSE={verif[\"RMSE\"]}')
    
    req = ImpactRequest.from_snapshot(snap, prob[\"probability\"], verif[\"verification_status\"])
    r_imp = client.post('/ml/impact', json=req.model_dump())
    assert r_imp.status_code == 200, r_imp.text
    imp = r_imp.json()
    print(f'  Impact: met_intensity={imp[\"meteorological_intensity\"][\"risk_level\"]}, flood={imp[\"flood_risk\"][\"status\"]}')
print('ALL SMOKE TESTS PASSED!')
"
```

### Expected Behavior Matrix
| Horizon | Expected `model_status` | Expected `fallback` | Expected `model_id` | Expected `probability.calibration_status` |
|---|---|---|---|---|
| **+24h** | `DEPLOY_CORRECTED` | `false` | `hazardguard_v7_24h` | `UNCALIBRATED_RAW_ENSEMBLE` |
| **+48h** | `FALLBACK_RAW_NWP` | `true` | `hazardguard_v7_48h` | `UNCALIBRATED_RAW_ENSEMBLE` |
| **+72h** | `FALLBACK_RAW_NWP` | `true` | `hazardguard_v7_72h` | `UNCALIBRATED_RAW_ENSEMBLE` |

---

## 3. Running Automated Tests

Run the full automated test suite (136 tests):
```powershell
.\.venv-ml\Scripts\python.exe -m pytest tests\ml\ -v
```

Run focused API regression tests only:
```powershell
.\.venv-ml\Scripts\python.exe -m pytest tests\ml\api\test_audit_fixes_regression.py -v
```

---

## 4. Contract Verification Checklist for Ronak

When integrating UI components, verify that the application layer checks:
- [ ] `snapshot_id` is propagated untouched from `/ml/forecast` to `/ml/probability`, `/ml/verification`, and `/ml/impact`.
- [ ] `lead_hours` in request matches the timeline slider (24, 48, or 72).
- [ ] `nwp_valid_time` is rendered as the primary validity time of the forecast.
- [ ] `nwp_initialization_time` is handled gracefully when `null`.
- [ ] `model_status` determines whether the UI shows "ML Bias-Corrected" or "Raw NWP (Safety Fallback)".
- [ ] `calibration_status` displays `"UNCALIBRATED_RAW_ENSEMBLE"` with mandatory disclaimer.
- [ ] `FSS_status` displays `"FSS_NOT_VALIDATED"`.
- [ ] `flood_risk.status` displays `"FLOOD_MODEL_UNAVAILABLE"` and is never reported as "Safe".
- [ ] `ensemble_quality` displays `"FULL"` or flags `"INVALID"` if anomalous members occurred.

---

## 5. Status Codes & Meaning Reference

### HTTP Status Codes
* **200 OK:** Request processed successfully; valid scientific response returned.
* **404 Not Found:**
  - Coordinates outside covered geographic boundaries (e.g. coordinates outside Indian subcontinent bounding box).
  - No forecast data returned by upstream provider for requested time range.
* **422 Unprocessable Entity:**
  - Latitude or longitude out of bounds (lat not in $[-90, 90]$, lon not in $[-180, 180]$).
  - Unsupported lead time (lead time not in $[24, 48, 72]$).
  - Anti-spoofing rejection: Attempting to override `event_threshold_mm` to anything other than $15.6\text{ mm}$.
  - Anti-spoofing rejection: Passing `event_probability < 0.0` or `> 1.0`.
  - Passing an invalid string for `verification_status` (must be `"VERIFIED"` or `"NOT_VALIDATED"`).
* **500 Internal Server Error:**
  - Model loader initialization failure or missing required XGBoost artifact.
  - Upstream provider returned empty ensemble statistics.
* **502 Bad Gateway:**
  - Network timeout or upstream Open-Meteo API connection error.

### Cache & Quality Status Strings
* **`CACHE_REUSED`:**
  - Request parameters matched a locally cached provider response in `scratch/openmeteo_cache`. Identical NWP data was reused.
* **`CACHE_MISS_RUN_IDENTITY_NOT_GUARANTEED`:**
  - Request required a fresh upstream network fetch. Run-cycle identity cannot be guaranteed identical to earlier calls.
* **`FULL`:**
  - Ensemble exceedance calculation executed cleanly; raw probability value is finite and in $[0.0, 1.0]$.
* **`INVALID`:**
  - Anomaly detected in raw ensemble calculation (e.g. non-finite or out of bounds); value was clamped to $[0.0, 1.0]$ for safety.

### Hazard Assessment Status Strings
* **`COMPUTED_METEOROLOGICAL_ONLY`:**
  - Severity level (`LOW`, `MODERATE`, `HIGH`) reflects atmospheric rainfall and exceedance probability only.
* **`METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS`:**
  - The overall hazard rating does not synthesize multi-hazard physical consequences.
* **`FLOOD_MODEL_UNAVAILABLE`:**
  - Hydrological runoff and inundation depth model is disconnected.
* **`LANDSLIDE_MODEL_UNAVAILABLE`:**
  - Geotechnical terrain slope failure model is disconnected.
* **`DATA_UNAVAILABLE`:**
  - Road, critical infrastructure, or population vulnerability layers are missing from the evaluation.
