import requests
import json

forecast = {
    "snapshot_id":"6524bc7e-8f2a-4d60-baed-d3bc9c72190d",
    "timestamp":"2026-09-06T22:53:57.691914+00:00",
    "latitude":12.9716,
    "longitude":77.5946,
    "lead_hours":24,
    "accumulation_hours":24.0,
    "provider":"ecmwf_ifs",
    "provider_model":"ecmwf_ifs025",
    "nwp_valid_time":"2026-09-07T00:00:00+00:00",
    "nwp_initialization_time":None,
    "model_id":"hazardguard_v7_24h",
    "model_type":"Residual",
    "rainfall_mm":0.75,
    "raw_nwp_mm":0.0,
    "model_status":"DEPLOY_CORRECTED",
    "fallback":False,
    "fallback_reason":None,
    "ml_correction_applied":True,
    "ml_correction_status":"APPLIED_RESIDUAL_XGBOOST",
    "feature_schema":["forecast_precip_mm"],
    "distribution_type":"SINGLE_VALUE",
    "statistics_quality":None,
    "run_id":"openmeteo_2026-09-06",
    "run_status":None,
    "init_time_source":None,
    "distribution":None
}

r = requests.post("http://127.0.0.1:8000/ml/verification", json=forecast)
print(r.status_code)
print(r.text)
