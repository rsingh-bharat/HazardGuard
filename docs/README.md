# HazardGuard Sayan Scientific ML Handoff

**Author:** Sayan (Scientific ML Subsystem Owner)  
**Recipient:** Ronak (Frontend / Backend / Application Subsystem Owner)  
**Project:** HazardGuard / SIH26080  
**Baseline Status:** 136/136 tests passing | Post-Remediation Audit Verdict: SHIP-READY WITH MINOR CAVEATS  

---

## Welcome Ronak — Start Here

This directory contains the frozen, audited, and contract-hardened **Scientific ML subsystem** for HazardGuard. It delivers numerical rainfall bias correction, raw uncalibrated ensemble exceedance probabilities, offline test-set verification benchmarks, decoupled meteorological intensity classification, and structured machine-readable grounding context for future RAG/LLM reporting.

Additionally, this handoff includes the exact **Training Data Transfer Assets** and manifests required to reproduce or audit the authoritative deployed models.

### Reading Order

Please review the documentation in this order before integrating:

1. **[`README.md`](README.md)** *(this document)*: Overview and orientation.
2. **[`SAYAN_RONAK_ML_HANDOFF.md`](SAYAN_RONAK_ML_HANDOFF.md)**: Architectural boundaries, team responsibilities, data flow, and pipeline constraints.
3. **[`API_CONTRACTS.md`](API_CONTRACTS.md)**: Exact request/response schemas, field validations, status codes, and sample payloads for all 4 microservice endpoints.
4. **[`SCIENTIFIC_SEMANTICS.md`](SCIENTIFIC_SEMANTICS.md)**: Practical guidelines on proper scientific phrasing, preventing false safety assumptions, and display rules (`UNKNOWN != SAFE`, `UNAVAILABLE != LOW RISK`).
5. **[`REGIME_CLASSIFIER_ROADMAP.md`](REGIME_CLASSIFIER_ROADMAP.md)**: Explains why the `RegimeClassifier` is currently **dormant / not deployed**, and outlines the criteria required for future activation.
6. **[`RUNBOOK.md`](RUNBOOK.md)**: Step-by-step commands to start the ML FastAPI microservice, run health checks, execute multi-lead smoke tests, and interpret response codes.
7. **[`RUNTIME_DEPENDENCIES.md`](RUNTIME_DEPENDENCIES.md)**: Verified Python 3.12 runtime environment, packages, and operational requirements.
8. **[`STORAGE_LAYOUT.md`](STORAGE_LAYOUT.md)**: Detailed breakdown of the intentional C: vs D: disk layout, ensuring runtime independence from training datasets.
9. **[`TRAINING_DATA_MANIFEST.md`](TRAINING_DATA_MANIFEST.md)**: Complete provenance trace, checksums, splits, and training scripts for the authoritative deployed models.
10. **[`TRAINING_DATA_MANIFEST.json`](TRAINING_DATA_MANIFEST.json)**: Machine-readable JSON manifest of training datasets and reproduction hyper-parameters.
11. **[`HANDOFF_MANIFEST.json`](HANDOFF_MANIFEST.json)**: Complete system manifest covering code, models, contracts, and training assets.

---

## What You Are Receiving

### 1. Runtime Package
Contains everything required to run and test the live ML service:
* **Production ML Microservice (FastAPI)**:
  - Root: `ml/api/main.py`
  - Endpoints:
    - `POST /ml/forecast`: Numerical rainfall forecast anchored by a unique `ForecastSnapshot`.
    - `POST /ml/probability`: Raw uncalibrated ensemble exceedance probability (>= 15.6 mm).
    - `POST /ml/verification`: Authoritative historical test-set performance metrics from `model_registry.json`.
    - `POST /ml/impact`: Decoupled meteorological intensity evaluation and explicit hazard boundaries.
* **Authoritative Model Registry & Artifacts**:
  - `ml/models/model_registry.json`: The single source of truth for deployment status and verification benchmarks.
  - `ml/models/candidates/24h_residual.json`: Validated +24h XGBoost residual bias correction model.
  - `ml/models/metadata.json`: Clearly marked `SUPERSEDED` (preserved strictly for training provenance).
* **Full Automated Test Suite**:
  - `tests/ml/`: 136 passing tests covering API contracts, anti-spoofing, error injection, numerical bounds, and pipeline coherence.
* **Validated Contract Payloads**:
  - `ml/contracts/samples/`: Exact JSON fixtures for frontend mock servers and UI testing.

### 2. Training Data Package
Contains the verified historical datasets and builder scripts needed to reproduce the models (now archived):
* `archive/training_data/dataset_v7_corrected.parquet`: The authoritative 35,190-row training dataset with full wind vector decomposition ($u, v$) used to train `hazardguard_v7_24h` (`24h_residual.json`).
* `archive/training_data/final_historical_dataset.parquet`: Intermediate historical dataset prior to wind vector augmentation.
* `archive/training_data/serious_training_data.parquet`: Historical research prototype dataset.
* `archive/training_data/train_final.py`: Training script that generated the authoritative model registry and candidate models.
* `archive/training_data/builder_v7.py`: Dataset generation script that constructed `dataset_v7_corrected.parquet`.

---

## Runtime vs Training Separation Rule

> [!IMPORTANT]
> **Training data is NOT required for runtime inference.**
> Ronak's application services, Docker images, and frontend integration must **only** depend on the runtime package. Do NOT load or mount the parquet training datasets into the frontend/backend runtime.

---

## Quick Operational Summary

| Forecast Horizon | Deployed Model | Deployment Status | Operational Behavior |
|---|---|---|---|
| **+24h** | `hazardguard_v7_24h` | `DEPLOY_CORRECTED` | Evaluates XGBoost residual model over NWP features (safety-gated). |
| **+48h** | `RAW_NWP` | `FALLBACK_RAW_NWP` | Safety gate active. Passes through raw NWP rainfall without ML adjustment. |
| **+72h** | `RAW_NWP` | `FALLBACK_RAW_NWP` | Safety gate active. Passes through raw NWP rainfall without ML adjustment. |

```bash
# Launch the ML API (from repository root)
.\.venv-ml\Scripts\python.exe -m uvicorn ml.api.main:app --host 0.0.0.0 --port 8000
```
