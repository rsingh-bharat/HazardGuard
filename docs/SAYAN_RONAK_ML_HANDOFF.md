# Sayan -> Ronak Scientific ML Handoff Specification

**Subsystem:** HazardGuard Scientific Forecasting & Numerical Verification (SIH26080)  
**Author:** Sayan (Scientific ML Subsystem Lead)  
**Recipient:** Ronak (Frontend / Backend Architecture & Application Integration Lead)  
**Audited Status:** SHIP-READY WITH MINOR CAVEATS (136/136 tests passing)  

---

## 1. Purpose

This document governs the official architectural and technical handoff of the Sayan-owned Scientific Machine Learning (ML) subsystem to Ronak for operational integration into the HazardGuard frontend, application gateway, and dashboard services.

It defines clear ownership boundaries, describes data pipelines, enumerates authoritative contracts, establishes non-negotiable scientific constraints, and provides explicit operational guidelines.

---

## 2. Ownership Boundaries

To ensure separation of concerns and maintain scientific integrity across HazardGuard:

### Sayan Owns (Scientific ML Subsystem)
* **NWP Ingestion:** Normalized retrieval of ECMWF IFS and GEFS numerical weather predictions via Open-Meteo single-run APIs.
* **Feature Engineering:** Causality-safe extraction of meteorological features (FeatureExtractor), including cyclic day-of-year and wind vector components (, v$).
* **Rainfall Post-Processing:** Lead-time-gated machine learning models evaluating residual bias correction against historical observational benchmarks.
* **Probability Engine:** Exceedance probability calculation over raw perturbed ensemble members ($\ge 15.6\text{ mm}$).
* **Offline Verification:** Benchmarked historical test-set metrics (RMSE, MAE, Bias, CSI, POD, FAR) stored in model_registry.json.
* **Scientific Provenance:** Unique ForecastSnapshot anchoring, model lineage, checksum tracking, and the machine-readable ScientificContext.
* **Microservice Layer:** FastAPI endpoints serving numerical forecast, probability, verification, and decoupled impact status.

### Ronak Owns (Frontend, Application Backend, User Interface)
* **Frontend Web Application:** Next.js / React UI components, interactive maps (Deck.gl, MapLibre), hazard dashboards, timeline sliders, and HUD alerts.
* **Application Backend / Gateway:** User session management, caching, database persistence (PostgreSQL/Supabase), and API orchestration calling Sayan's microservice.
* **Reporting & Notifications:** External PDF export, alert generation, SMS/push dispatch, and stakeholder-facing summaries.
* **LLM / RAG Presentation:** Feeding Sayan's factual ScientificContext into language models to generate narrative advisories without numerical hallucination.

### Soumy Owns (Physical Impact & 3D Digital Twin)
* **Physical Modelling:** Terrain Digital Elevation Models (DEM), hydrological catchment analysis, Manning's roughness, rainfall-to-runoff simulation, and flow accumulation.
* **Hazard & Vulnerability:** Inundation depth, flow velocity, slope stability analysis (landslide safety factor), and asset exposure mapping (roads, buildings, population).
* **3D Twin Visualization:** Three.js / WebGL physical twin rendering water flow and structural stress.

---

## 3. Current Scientific Pipeline Flow

The ML microservice implements a strict, unidirectional data pipeline:

`
[Upstream NWP Provider (ECMWF IFS / Open-Meteo)]
                     |
                     v
   [Canonical Forecast Record Normalization]
                     |
                     v
 [Feature Extraction (Causality-safe atmospherics)]
                     |
                     v
     [Lead-Time Safety Gate Evaluation]
      /                              \
(+24h Gated Pass)            (+48h / +72h Safety Gate Rejection)
     |                                        |
[XGBoost Residual Bias Corrector]      [RAW NWP Pass-Through]
     \                                        /
      v                                      v
  ------------------------------------------------
           [Authoritative ForecastSnapshot]
  ------------------------------------------------
          |                       |
          v                       v
[POST /ml/probability]   [POST /ml/verification]
  (Raw Ensemble Exceed)    (Registry Offline Metrics)
          \                       /
           \                     /
            v                   v
      ----------------------------------
             [POST /ml/impact]
       (Decoupled Meteorological State)
      ----------------------------------
                     |
                     v
       [Structured ScientificContext]
         (LLM / External Grounding)
`

---

## 4. Current Deployment & Model Behavior

In accordance with offline validation results against IMD gridded reference data:

1. **+24h Lead Time (hazardguard_v7_24h):**
   - **Deployment Status:** DEPLOY_CORRECTED
   - **Model Architecture:** Residual XGBoost (24h_residual.json).
   - **Operational Behavior:** Predicts the residual error ($\text{Observed} - \text{NWP}$), adding it to the raw forecast rainfall while enforcing non-negativity ( \ge 0.0$).
   - **Safety Gate:** If any required synoptic feature is missing from the provider response (e.g. cloud cover), the service automatically drops back to FALLBACK_RAW_NWP.

2. **+48h Lead Time (hazardguard_v7_48h):**
   - **Deployment Status:** FALLBACK_RAW_NWP
   - **Model Architecture:** RAW
   - **Operational Behavior:** Safety gate strictly enforced. ML candidates failed validation benchmark criteria; therefore, the system passes through raw NWP rainfall unmodified.

3. **+72h Lead Time (hazardguard_v7_72h):**
   - **Deployment Status:** FALLBACK_RAW_NWP
   - **Model Architecture:** RAW
   - **Operational Behavior:** Safety gate strictly enforced. Passes through raw NWP rainfall unmodified.

---

## 5. Critical Scientific Constraints

Ronak and the frontend application must adhere to these inviolable scientific invariants:

1. **No Invented Values:** Under no circumstances should frontend or application code invent synthetic rainfall amounts, probability scores, or coordinates. If an API call fails or returns null, the UI must display unavailable states.
2. **Rainfall Exceedance != Flood Probability:** Probability returned by /ml/probability represents meteorological frequency of rainfall exceeding .6\text{ mm}$ across raw perturbed ensemble members. It must **never** be labeled Flood Probability or Disaster Risk.
3. **Uncalibrated Raw Ensemble:** Probability calibration is unvalidated (calibration_status = UNCALIBRATED_RAW_ENSEMBLE). It must be displayed with explicit calibration disclaimers.
4. **Spatial Skill Score Unvalidated:** Fractions Skill Score is strictly unavailable (ss_status = FSS_NOT_VALIDATED, FSS = null). The UI must not claim sub-grid spatial accuracy.
5. **Meteorological Intensity != Hazard Consequence:** Meteorological severity (LOW, MODERATE, HIGH) reflects atmospheric rainfall only. Flood risk, landslide risk, and infrastructure damage are strictly UNKNOWN / DATA_UNAVAILABLE until computed by Soumy's physical impact engine.
6. **Unknown != Safe / Unavailable != Low Risk:** The UI must display explicit warnings for missing models, rather than assuming conditions are safe.
7. **NWP Initialization Time is Null:** Open-Meteo does not expose upstream model initialization run cycles. 
wp_initialization_time is intentionally 
ull.
8. **Cache Reuse Semantics:** CACHE_REUSED indicates parameter matching with the local disk cache, not a cryptographic guarantee of NWP run cycle identity. CACHE_MISS_RUN_IDENTITY_NOT_GUARANTEED is the honest default when a fresh fetch occurs.
9. **Regime Classifier is Dormant:** The research regime classifier is **not** deployed. The system must not be advertised as having operational regime-aware routing.

---

## 6. The ForecastSnapshot: Single Source of Truth

Every downstream endpoint (/ml/probability, /ml/verification, /ml/impact) requires an authoritative ForecastSnapshot object generated by /ml/forecast.

### Field Classifications

| Field Name | Type | Purpose | UI Display vs Backend Provenance |
|---|---|---|---|
| snapshot_id | UUID str | Global anchor tying all downstream calls to one forecast evaluation. | **Backend Provenance:** Used for logging, audit trails, and correlation. |
| 	imestamp | ISO8601 str | UTC timestamp when the snapshot was generated by HazardGuard. | **UI Display:** Show as Forecast Issue Time. |
| latitude, longitude | loat | Target coordinates evaluated (WGS84). | **UI Display:** Pin coordinates on map. |
| lead_hours | int | Horizon in hours (24, 48, or 72). | **UI Display:** Timeline slider selection (+24h, +48h, +72h). |
| provider | str | Name of upstream provider (e.g. ecmwf_ifs). | **UI Display / Provenance:** Source badge. |
| provider_model | str | Underlying NWP model ID (e.g. ecmwf_ifs025). | **Backend Provenance:** Audit trail. |
| 
wp_valid_time | ISO8601 str | Time for which the NWP forecast prediction is valid. | **UI Display:** Critical! Show as Valid For: [Date/Time]. |
| 
wp_initialization_time| Optional[str]| Upstream NWP run cycle time (
ull for Open-Meteo). | **Backend Provenance:** Documented provenance limitation. |
| model_id | str | Deployed HazardGuard model ID or RAW_NWP. | **UI Display / Provenance:** Model badge. |
| model_type | str | Architecture (Residual or RAW). | **Backend Provenance:** Audit log. |
| ainfall_mm | loat | Predicted 24h cumulative rainfall in mm. | **UI Display:** Primary headline figure on dashboard. |
| model_status | str | DEPLOY_CORRECTED or FALLBACK_RAW_NWP. | **UI Display:** Transparency badge (shows if bias correction is active). |
| allback | ool | 	rue if raw NWP fallback occurred. | **UI Display:** Alert icon / warning indicator. |
| allback_reason | Optional[str]| Reason explaining why fallback was mandated. | **UI Display:** Tooltip explaining why raw NWP is shown. |
| eature_schema | Optional[List]| Feature names expected by the model. | **Backend Provenance:** Technical audit metadata. |

---



## 8. Frontend / Backend Integration Rule

1. **Consume the HTTP API Contract Only:** Ronak's services must interact with the ML subsystem exclusively via HTTP requests to the FastAPI microservice (http://localhost:8000/ml/...).
2. **No Python Internals in TypeScript:** Do not attempt to port Python ML algorithms, XGBoost boosters, feature extraction logic, or ensemble calculation rules into JavaScript/TypeScript.
3. **Preserve Snapshot Integrity:** When calling /ml/probability, /ml/verification, or /ml/impact, pass the exact JSON object returned by /ml/forecast. Tampering with snapshot fields will trigger validation errors or anti-spoofing overrides.
