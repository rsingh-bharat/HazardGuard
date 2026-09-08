# HazardGuard Scientific Semantics & Data Interpretation Guide

**Author:** Sayan  
**Target Audience:** Ronak, Frontend Engineers, UI/UX Designers, Reporting Specialists  

---

## 1. Executive Summary

This document is the authoritative **"Do Not Misinterpret This Data"** guide for HazardGuard.

Because HazardGuard is a natural disaster warning platform, ambiguous or careless phrasing in the frontend can lead to dangerous real-world decisions by authorities or the public. The application tier must adhere strictly to established meteorological and scientific conventions.

---

## 2. Practical Phrasing Guidelines: Correct vs Prohibited

### Probability Semantics

| Context | Prohibited / Incorrect Phrasing | Correct / Authorized Phrasing | Rationale |
|---|---|---|---|
| `/ml/probability` output | "The flood probability is 2%." | "Rainfall exceedance probability (>= 15.6 mm) is 0.02 based on the raw ensemble." | Atmospheric rainfall probability is not inundation risk. Runoff, soil saturation, and drainage determine flooding. |
| `/ml/probability` output | "Calibrated flood risk is LOW." | "Exceedance probability is 0.02 (UNCALIBRATED_RAW_ENSEMBLE)." | The probability is an uncalibrated raw ensemble frequency. It must never be described as calibrated. |
| Zero probability returned | "No flood threat exists." | "0% of ensemble members predict >= 15.6 mm precipitation." | Low probability of moderate rain does not preclude localized flash flooding from antecedent soil saturation. |

---

### Meteorological vs Consequence Risk

| Context | Prohibited / Incorrect Phrasing | Correct / Authorized Phrasing | Rationale |
|---|---|---|---|
| Meteorological Intensity | "Meteorological intensity is HIGH, so flood risk is HIGH." | "Meteorological intensity is HIGH (rainfall >= 15.6 mm with probability >= 0.5). Flood and landslide consequence models are currently UNAVAILABLE." | Rainfall alone cannot evaluate slope failure or urban inundation. |
| Inundation Depth | "The model predicts 15 mm of flood water on roads." | "The forecast predicts 15.0 mm of cumulative 24h atmospheric rainfall." | Rainfall is atmospheric accumulation. Water depth requires hydraulic routing (Soumy's engine). |
| Missing Exposure Data | "No hospitals or roads are at risk." | "Infrastructure and road exposure assessment is DATA_UNAVAILABLE." | Missing data layers must not be reported as zero impact. |

---

### Verification & Accuracy

| Context | Prohibited / Incorrect Phrasing | Correct / Authorized Phrasing | Rationale |
|---|---|---|---|
| Verification RMSE | "The current forecast has an error of 11.44 mm." | "Historical test-set RMSE for this model at +24h is 11.44 mm." | RMSE is an aggregate historical benchmark score from offline validation, not a guarantee of error on today's run. |
| Spatial Accuracy | "The system guarantees 1 km local rainfall accuracy." | "Fractions Skill Score (FSS) is UNVALIDATED. Spatial precision is limited to provider grid resolution (approx 25 km)." | High-resolution radar/satellite spatial skill has not been validated. |
| Verification Status | "Model prediction is fully verified." | "Historical verification status: VERIFIED (offline test set evaluated)." | Live forecasts cannot be verified until post-event observations become available. |

---

### Unavailable Hazard Dimensions

| Context | Prohibited / Incorrect Phrasing | Correct / Authorized Phrasing | Rationale |
|---|---|---|---|
| Flood Model Status | "Flood risk is LOW / Safe." | "Flood consequence model: FLOOD_MODEL_UNAVAILABLE." | When a model is disconnected, consequence is unknown. |
| Landslide Model Status| "No landslide danger." | "Landslide consequence model: LANDSLIDE_MODEL_UNAVAILABLE." | Slope stability analysis requires geotechnical DEM modelling. |

---

## 3. Core Operational Principles

### Principle 1: UNKNOWN != SAFE
When a risk assessment endpoint returns `risk_level = "UNKNOWN"`, frontend code must **never** style the badge in green or display "Safe" or "No Danger".
* **Required UI Display:** Render an amber or gray badge with text `"MODEL UNAVAILABLE"` or `"DATA PENDING"`.
* **Required Tooltip:** `"Physical consequence modelling is not active for this hazard dimension."`

### Principle 2: UNAVAILABLE != LOW RISK
If road, population, or infrastructure layers return `status = "DATA_UNAVAILABLE"`, do **not** report zero buildings affected or clear roads.
* **Required UI Display:** Render a dashed line or `"N/A"` with a note that geospatial exposure assets are disconnected.

### Principle 3: Always Attribute NWP Run Time vs Issue Time
* **`timestamp`:** Represents when HazardGuard processed the snapshot (Issue Time).
* **`nwp_valid_time`:** Represents the target forecast window for the atmosphere (Valid Time).
* Both must be displayed on the UI so users know whether they are looking at current or future conditions.
