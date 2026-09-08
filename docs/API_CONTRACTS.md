# HazardGuard API Contracts Specification

**Microservice:** Scientific ML Inference Engine  
**Author:** Sayan  
**Consumer:** Ronak (Application Gateway & Frontend Services)  
**Base URL:** `http://localhost:8000`  
**OpenAPI Specification:** `GET /docs` or `GET /openapi.json`  

---

## Endpoint 1: POST /ml/forecast

### Purpose
Retrieves real-time numerical weather prediction (NWP) data from upstream providers, executes causality-safe atmospheric feature extraction, evaluates safety gates, applies XGBoost residual bias correction (if deployed for horizon), and returns an authoritative `ForecastSnapshot`.

### Request Schema (`ForecastRequest`)
| Field | Type | Required | Bounds / Validation | Description |
|---|---|---|---|---|
| `latitude` | `float` | Yes | `-90.0 <= lat <= 90.0` | Target latitude in decimal degrees (WGS84). |
| `longitude` | `float` | Yes | `-180.0 <= lon <= 180.0` | Target longitude in decimal degrees (WGS84). |
| `lead_time` | `int` | Yes | Must be `24`, `48`, or `72` | Forecast horizon in hours. |

#### Request Example
```json
{
  "latitude": 25.467,
  "longitude": 91.366,
  "lead_time": 24
}
```

### Response Schema (`ForecastSnapshot`)
| Field | Type | Description |
|---|---|---|
| `snapshot_id` | `str` (UUID) | Unique identifier for this forecast snapshot run. |
| `timestamp` | `str` (ISO8601 UTC) | Timestamp of forecast generation / issue. |
| `latitude` | `float` | Target latitude matching request. |
| `longitude` | `float` | Target longitude matching request. |
| `lead_hours` | `int` | Forecast horizon matching request. |
| `provider` | `str` | Name of upstream NWP provider (e.g. `ecmwf_ifs`). |
| `provider_model` | `str` | NWP model ID (e.g. `ecmwf_ifs025`). |
| `nwp_valid_time` | `str` (ISO8601 UTC) | Actual validity time of the forecast prediction. |
| `nwp_initialization_time` | `str` or `null` | NWP initialization run time (`null` for Open-Meteo). |
| `model_id` | `str` | HazardGuard model identifier or `RAW_NWP`. |
| `model_type` | `str` | `Residual` or `RAW`. |
| `rainfall_mm` | `float` | Predicted 24h cumulative rainfall in mm (strictly >= 0.0). |
| `model_status` | `str` | `DEPLOY_CORRECTED` or `FALLBACK_RAW_NWP`. |
| `fallback` | `bool` | `true` if raw NWP fallback occurred. |
| `fallback_reason` | `str` or `null` | Reason for fallback if applicable. |
| `feature_schema` | `List[str]` or `null`| List of feature names expected by the model. |

#### Response Example (`ml/contracts/samples/sample_forecast_response.json`)
```json
{
  "snapshot_id": "8c7c5f1e-7273-4a38-b425-df1315c047dc",
  "timestamp": "2026-09-03T03:27:37.114487+00:00",
  "latitude": 25.467,
  "longitude": 91.366,
  "lead_hours": 24,
  "provider": "ecmwf_ifs",
  "provider_model": "ecmwf_ifs025",
  "nwp_valid_time": "2026-09-04T00:00:00Z",
  "nwp_initialization_time": null,
  "model_id": "hazardguard_v7_24h",
  "model_type": "Residual",
  "rainfall_mm": 13.87,
  "model_status": "DEPLOY_CORRECTED",
  "fallback": false,
  "fallback_reason": null,
  "feature_schema": [
    "forecast_precip_mm",
    "forecast_temperature",
    "forecast_relative_humidity",
    "forecast_surface_pressure",
    "wind_u",
    "wind_v",
    "forecast_cloud_cover",
    "sin_day_of_year",
    "cos_day_of_year",
    "latitude",
    "longitude"
  ]
}
```

### Scientific Interpretation
* `rainfall_mm` represents accumulated precipitation over the 24-hour window ending at `nwp_valid_time`.
* `DEPLOY_CORRECTED` confirms the XGBoost residual bias correction model adjusted the raw NWP forecast.
* `FALLBACK_RAW_NWP` confirms raw NWP rainfall is passed through unmodified due to safety gating.

### Prohibited Interpretation
* Do NOT interpret `rainfall_mm` as instantaneous rainfall rate (e.g. mm/hr).
* Do NOT treat `rainfall_mm` as flood water depth.

---

## Endpoint 2: POST /ml/probability

### Purpose
Evaluates heavy-rainfall exceedance probability (>= 15.6 mm, IMD Moderate threshold) using raw perturbed ensemble members from the upstream NWP provider.

### Request Schema
Accepts the exact `ForecastSnapshot` object returned by `POST /ml/forecast`.

### Response Schema (`ProbabilityResponse`)
| Field | Type | Description |
|---|---|---|
| `snapshot_id` | `str` | Must match originating `ForecastSnapshot.snapshot_id`. |
| `timestamp` | `str` | Forecast issue timestamp matching snapshot. |
| `latitude` | `float` | Target latitude matching snapshot. |
| `longitude` | `float` | Target longitude matching snapshot. |
| `lead_hours` | `int` | Lead time matching snapshot. |
| `event_definition` | `str` | Meteorological event definition (default `"rainfall >= 15.6 mm"`). |
| `threshold_mm` | `float` | Authoritative IMD threshold (15.6 mm). |
| `probability` | `float` | Raw ensemble exceedance probability strictly in [0.0, 1.0]. |
| `calibration_status` | `str` | Strictly `"UNCALIBRATED_RAW_ENSEMBLE"`. |
| `ensemble_member_count`| `int` | Number of perturbed ensemble members evaluated (e.g. 50). |
| `historical_positive_event_count`| `int` or `null`| Strictly `null` for uncalibrated raw ensembles. |
| `source` | `str` | Provider source name (e.g. `ECMWF-IFS-OpenMeteo`). |
| `model_metadata` | `str` | Upstream provider model ID (`ecmwf_ifs025`). |
| `model_status` | `str` | Model status propagated from snapshot. |
| `fallback_status` | `str` | Explanation of calibration limitation. |
| `ensemble_cache_status`| `str` | `"CACHE_REUSED"` or `"CACHE_MISS_RUN_IDENTITY_NOT_GUARANTEED"`. |
| `ensemble_quality` | `str` | `"FULL"` for healthy members in [0.0, 1.0], or `"INVALID"`. |

#### Response Example (`ml/contracts/samples/sample_probability_response.json`)
```json
{
  "snapshot_id": "8c7c5f1e-7273-4a38-b425-df1315c047dc",
  "timestamp": "2026-09-03T03:27:37.114487+00:00",
  "latitude": 25.467,
  "longitude": 91.366,
  "lead_hours": 24,
  "event_definition": "rainfall >= 15.6 mm",
  "threshold_mm": 15.6,
  "probability": 0.02,
  "calibration_status": "UNCALIBRATED_RAW_ENSEMBLE",
  "ensemble_member_count": 50,
  "historical_positive_event_count": null,
  "source": "ECMWF-IFS-OpenMeteo",
  "model_metadata": "ecmwf_ifs025",
  "model_status": "DEPLOY_CORRECTED",
  "fallback_status": "No validated calibration artifact available; exposing raw ensemble probability.",
  "ensemble_cache_status": "CACHE_REUSED",
  "ensemble_quality": "FULL"
}
```

### Scientific Interpretation
* `probability` is the proportion of ensemble members predicting >= 15.6 mm of rainfall.
* It is an **uncalibrated relative frequency**, not a calibrated Bayesian posterior probability.

### Prohibited Interpretation
* **NEVER label this "Flood Probability" or "Disaster Probability".**
* Do NOT display this as a calibrated risk score without showing the `UNCALIBRATED_RAW_ENSEMBLE` disclaimer.

---

## Endpoint 3: POST /ml/verification

### Purpose
Returns authoritative offline benchmark test-set verification metrics (RMSE, MAE, Bias, CSI, POD, FAR) from `model_registry.json` corresponding to the snapshot's lead time and deployed model.

### Request Schema
Accepts the exact `ForecastSnapshot` object returned by `POST /ml/forecast`.

### Response Schema (`VerificationResponse`)
| Field | Type | Description |
|---|---|---|
| `snapshot_id` | `str` | Must match originating `ForecastSnapshot.snapshot_id`. |
| `timestamp` | `str` | Snapshot issue timestamp. |
| `latitude`, `longitude`| `float` | Target coordinates matching snapshot. |
| `lead_hours` | `int` | Horizon matching snapshot. |
| `provider`, `provider_model` | `str` | Source metadata propagated from snapshot. |
| `model_id` | `str` | Authoritative model ID from registry. |
| `model_status` | `str` | Propagated deployment status. |
| `baseline_model` | `str` | Benchmark baseline model (`RAW_NWP`). |
| `RMSE`, `MAE`, `Bias` | `float` or `null`| Error metrics on independent test set. |
| `CSI`, `POD`, `FAR` | `float` or `null`| Categorical skill metrics for heavy rain (>= 64.5 mm). |
| `FSS` | `null` | Fractions Skill Score (strictly `null`). |
| `FSS_status` | `str` | Strictly `"FSS_NOT_VALIDATED"`. |
| `verification_status` | `str` | Strictly `"VERIFIED"` or `"NOT_VALIDATED"`. |
| `sample_metadata` | `dict` or `null` | Test sample counts and heavy event counts. |

#### Response Example (`ml/contracts/samples/sample_verification_response.json`)
```json
{
  "snapshot_id": "8c7c5f1e-7273-4a38-b425-df1315c047dc",
  "timestamp": "2026-09-03T03:27:37.114487+00:00",
  "latitude": 25.467,
  "longitude": 91.366,
  "lead_hours": 24,
  "provider": "ecmwf_ifs",
  "provider_model": "ecmwf_ifs025",
  "model_id": "hazardguard_v7_24h",
  "model_status": "DEPLOY_CORRECTED",
  "baseline_model": "RAW_NWP",
  "RMSE": 11.443373325397994,
  "MAE": 7.080601991050627,
  "Bias": 1.2708410275100102,
  "CSI": 0.4049586776859504,
  "POD": 0.6490066225165563,
  "FAR": 0.48148148148148145,
  "FSS": null,
  "FSS_status": "FSS_NOT_VALIDATED",
  "verification_status": "VERIFIED",
  "sample_metadata": {
    "heavy_events": 453,
    "test_samples": 2070
  }
}
```

### Distinction: `verification_status` vs `fss_status`
* **`verification_status` (`"VERIFIED"` | `"NOT_VALIDATED"`):** Indicates whether offline point-based test-set metrics exist in `model_registry.json` for this lead time.
* **`fss_status` (`"FSS_NOT_VALIDATED"`):** Specifically indicates that spatial high-resolution radar/satellite spatial skill (Fractions Skill Score) was **not** computed.

---

## Endpoint 4: POST /ml/impact

### Purpose
Evaluates meteorological severity while enforcing strict decoupled boundaries against unavailable physical impact models (flood, landslide, infrastructure, road, population exposure).

### Request Schema (`ImpactRequest`)
Can be instantiated directly or via the factory method `ImpactRequest.from_snapshot(snapshot, event_probability, verification_status)`.

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| `snapshot_id` | `str` | Yes | Non-empty | Originating snapshot UUID. |
| `timestamp` | `str` | Yes | ISO8601 | Snapshot timestamp. |
| `latitude`, `longitude`| `float` | Yes | Valid WGS84 | Target location. |
| `lead_hours` | `int` | Yes | 24, 48, or 72 | Forecast horizon. |
| `rainfall_mm` | `float` | Yes | `>= 0.0` | Predicted rainfall. |
| `event_probability` | `float` | Yes | `0.0 <= p <= 1.0` | Raw ensemble probability. |
| `event_threshold_mm` | `float` | No | Must be `15.6` if set | Authoritative threshold. |
| `model_id`, `model_status`| `str` | Yes | Non-empty | Snapshot model lineage. |
| `fallback` | `bool` | Yes | Boolean | Fallback indicator. |
| `fallback_reason` | `str` | No | Optional | Fallback explanation. |
| `verification_status` | `str` | Yes | `"VERIFIED"` or `"NOT_VALIDATED"` | Verification enum. |

### Anti-Spoofing Protections
* Overriding `event_threshold_mm` to any value other than 15.6 mm triggers **HTTP 422**.
* Supplying `event_probability > 1.0` or `< 0.0` triggers **HTTP 422**.
* Submitting `model_status = "DEPLOY_CORRECTED"` for +48h or +72h is overridden by the server back to `FALLBACK_RAW_NWP` per `model_registry.json`.

### Response Schema (`HazardState`)
| Field | Type | Risk Level | Status | Scientific Meaning |
|---|---|---|---|---|
| `meteorological_intensity` | `RiskAssessment` | `LOW`, `MODERATE`, `HIGH` | `COMPUTED_METEOROLOGICAL_ONLY` | Evaluated strictly from rainfall and exceedance probability. |
| `flood_risk` | `RiskAssessment` | `UNKNOWN` | `FLOOD_MODEL_UNAVAILABLE` | Physical inundation model disconnected. |
| `landslide_risk` | `RiskAssessment` | `UNKNOWN` | `LANDSLIDE_MODEL_UNAVAILABLE` | Geotechnical slope model disconnected. |
| `road_risk` | `RiskAssessment` | `UNKNOWN` | `DATA_UNAVAILABLE` | Road network exposure layer missing. |
| `infrastructure_risk` | `RiskAssessment` | `UNKNOWN` | `DATA_UNAVAILABLE` | Infrastructure asset layer missing. |
| `population_risk` | `RiskAssessment` | `UNKNOWN` | `DATA_UNAVAILABLE` | Population census layer missing. |
| `overall_hazard_level` | `RiskAssessment` | Matches met intensity | `METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS` | Pure meteorological indicator. |

#### Response Example (`ml/contracts/samples/sample_impact_response.json`)
```json
{
  "snapshot_id": "8c7c5f1e-7273-4a38-b425-df1315c047dc",
  "timestamp": "2026-09-03T03:27:37.114487+00:00",
  "latitude": 25.467,
  "longitude": 91.366,
  "lead_hours": 24,
  "rainfall_mm": 13.87,
  "event_probability": 0.02,
  "event_threshold_mm": 15.6,
  "model_id": "hazardguard_v7_24h",
  "model_status": "DEPLOY_CORRECTED",
  "fallback": false,
  "fallback_reason": null,
  "verification_status": "VERIFIED",
  "meteorological_intensity": {
    "risk_level": "LOW",
    "status": "COMPUTED_METEOROLOGICAL_ONLY"
  },
  "flood_risk": {
    "risk_level": "UNKNOWN",
    "status": "FLOOD_MODEL_UNAVAILABLE"
  },
  "landslide_risk": {
    "risk_level": "UNKNOWN",
    "status": "LANDSLIDE_MODEL_UNAVAILABLE"
  },
  "road_risk": {
    "risk_level": "UNKNOWN",
    "status": "DATA_UNAVAILABLE"
  },
  "infrastructure_risk": {
    "risk_level": "UNKNOWN",
    "status": "DATA_UNAVAILABLE"
  },
  "population_risk": {
    "risk_level": "UNKNOWN",
    "status": "DATA_UNAVAILABLE"
  },
  "overall_hazard_level": {
    "risk_level": "LOW",
    "status": "METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS"
  }
}
```
