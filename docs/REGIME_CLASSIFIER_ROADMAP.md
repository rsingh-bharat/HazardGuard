# HazardGuard Weather Regime Classifier: Roadmap & Deployment Criteria

**Module:** `RegimeClassifier` (`ml/sih_pipeline/regime_classifier.py`)  
**Current Operational Status:** **NOT DEPLOYED / RESEARCH PROTOTYPE ONLY**  
**Lead Researcher:** Sayan  
**Consumer:** Ronak (Architecture Planning)  

---

## 1. Current State & Why It Is NOT in Runtime Serving

In the existing codebase, an experimental weather regime classifier exists under `ml/sih_pipeline/regime_classifier.py`. However, during the rigorous scientific audits, the `RegimeClassifier` was **deliberately excluded from the live operational inference path**.

### Fact 1: Not Imported in the Serving Layer
Grep searches across `ml/api/` confirm:
* `RegimeClassifier` is **zero times imported** by `ml/api/main.py`, `ml/api/impact.py`, `ml/api/context.py`, or `ml/model_loader.py`.
* Production model routing is driven strictly by lead time via `ml/models/model_registry.json`.

### Fact 2: Label Methodology Limitation
* The prototype classifier was trained on synthetic/rule-based heuristics rather than ground-truth synoptic weather classification records (e.g. IMD Monsoon Depression bulletins).
* Using heuristic labels creates circular reasoning and label leakage during post-processing.

### Fact 3: Operational Feature Availability Mismatch
* The prototype feature schema includes features such as:
  ```python
  'recentObservedRainfallMm', 'recent3DayRainfallMm', 'recent7DayRainfallMm'
  ```
* These rolling observational rainfall features are available in retrospective training datasets (where ERA5 or IMD observations exist), but **are not available in real time** when querying the live Open-Meteo forward forecast API.
* Activating the classifier in live serving would cause feature corruption or massive missing-value defaults, degrading forecast skill.

### Fact 4: Explicit Audit Invariant
* Every independent scientific audit has mandated that the system **must not** be presented as having operational regime-aware routing until proper validation is completed.

---

## 2. Target Stage: REGIME-AWARE ROUTING VALIDATION

When future development resumes on regime-aware forecasting, activation will follow this strict gate:

### Prerequisites for Operational Activation

1. **Scientifically Defensible Ground-Truth Regime Labels:**
   - Replace heuristic labels with validated synoptic classifications (Active Monsoon, Break Monsoon, Low Pressure Area, Monsoon Depression, Western Disturbance) derived from official IMD meteorological bulletins.
2. **Strict Live-Inference Feature Compatibility:**
   - Restrict features strictly to variables available at live forecast run time (synoptic NWP parameters: pressure, wind vector, temperature, moisture convergence, vorticity) without requiring real-time observational rainfall feedback.
3. **Chronological / Temporal Validation:**
   - Evaluate classifier accuracy across distinct monsoon seasons (e.g. train on 2020-2023, validate on 2024, test on 2025) with zero overlap.
4. **Geographic Generalization:**
   - Demonstrate skill across diverse climatic zones of India (Western Ghats, Indo-Gangetic Plain, Northeast Hills, Coastal Plains).
5. **Sample Support Verification:**
   - Ensure minimum threshold of verified events per regime class ($N \ge 200$) to prevent severe class imbalance artifacts.
6. **Regime-Stratified Comparative Skill Evaluation:**
   - Prove statistically significant improvement of regime-routed bias correction over both RAW NWP and unrouted ML baseline (testing Critical Success Index and RMSE).
7. **Fail-Safe Deployment Gate:**
   - If regime prediction entropy is high or confidence is below 0.60, the model must automatically fall back to standard unrouted safety-gated models.
8. **Independent Adversarial Audit:**
   - Pass a hostile review of training lineage, feature causality, and code paths.
9. **Full Automated Test Coverage:**
   - Update `tests/ml/` with end-to-end regime classification and fallback regression tests.
10. **Updated Registry & Contracts:**
    - Document regime definitions in `model_registry.json` and publish updated API schemas.

---

## 3. Future Operational Pipeline Architecture

Upon successful validation, the future production pipeline will operate as follows:

```
[Upstream NWP Record (Open-Meteo)]
               |
               v
 [Causality-Safe Live Atmospheric Features]
               |
               v
   [Validated Regime Classifier]
               |
        Regime Probability Vector
               |
               v
   [Regime-Aware Routing Gate]
     /         |         \
 [Monsoon] [Depression] [Orographic] ...
     \         |         /
      v        v        v
[Regime-Specific XGBoost Residual Models]
               |
               v
  [Authoritative ForecastSnapshot]
```

---

## 4. Integration Summary for Ronak

* **For Current Handoff:** Treat regime-aware routing as **NOT DEPLOYED**.
* Do not expose regime selectors or regime indicators in the primary user dashboard as active capabilities.
* The API endpoints (`/ml/forecast`, `/ml/probability`, `/ml/verification`, `/ml/impact`) are completely stable, deterministic, and lead-time gated without regime dependencies.
