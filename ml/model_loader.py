import os
import json
import logging
import hashlib
from pathlib import Path
import numpy as np
import xgboost as xgb

DEFAULT_REGISTRY_PATH = Path(__file__).resolve().parent / "models" / "model_registry.json"

class BiasCorrectorModel:
    def __init__(self, registry_path=None):
        self.registry_path = str(registry_path) if registry_path is not None else str(DEFAULT_REGISTRY_PATH)
        self.registry = {}
        self.models = {}
        self._load_registry()
        
    def _resolve_path(self, filepath: str) -> str:
        if filepath and not os.path.isabs(filepath):
            repo_root = Path(__file__).resolve().parent.parent
            resolved = repo_root / filepath
            if resolved.exists():
                return str(resolved)
        return filepath

    def _calculate_checksum(self, filepath):
        sha256_hash = hashlib.sha256()
        try:
            with open(filepath, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
        except FileNotFoundError:
            return None

    def _load_registry(self):
        if not os.path.exists(self.registry_path):
            logging.warning("Model registry not found. Operating in RAW_NWP fallback mode.")
            return
            
        with open(self.registry_path, "r") as f:
            registry_data = json.load(f)
            
        for lead_record in registry_data:
            lead = float(lead_record["lead"])
            self.registry[lead] = lead_record
            
            if lead_record["deployment_status"] == "DEPLOY_CORRECTED":
                artifact_path = self._resolve_path(lead_record["artifact_path"])
                if "artifact_path_2" in lead_record:
                    # TwoStage model
                    p1 = artifact_path
                    p2 = self._resolve_path(lead_record["artifact_path_2"])
                    if not os.path.exists(p1) or not os.path.exists(p2):
                        logging.error(f"Missing artifact for {lead}h")
                        continue
                        
                    c1_expected = lead_record.get("artifact_checksum")
                    c2_expected = lead_record.get("artifact_checksum_2")
                    c1_actual = self._calculate_checksum(p1)
                    c2_actual = self._calculate_checksum(p2)
                    
                    if (c1_expected and c1_actual != c1_expected) or (c2_expected and c2_actual != c2_expected):
                        logging.error(f"Checksum mismatch for TwoStage models at {lead}h")
                        continue
                        
                    m1, m2 = xgb.Booster(), xgb.Booster()
                    m1.load_model(p1)
                    m2.load_model(p2)
                    self.models[lead] = (m1, m2)
                else:
                    expected_checksum = lead_record.get("artifact_checksum")
                    actual_checksum = self._calculate_checksum(artifact_path)
                    
                    if not os.path.exists(artifact_path):
                        logging.error(f"Missing artifact {artifact_path} for {lead}h")
                        continue
                        
                    if expected_checksum and actual_checksum != expected_checksum:
                        logging.error(f"Checksum mismatch for {artifact_path}. Expected {expected_checksum}, got {actual_checksum}")
                        continue
                        
                    model = xgb.Booster()
                    model.load_model(artifact_path)
                    self.models[lead] = model

    def predict(self, lead_hours, df_features):
        lead_hours = float(lead_hours)
        if lead_hours not in self.registry:
            logging.error(f"Unsupported lead time: {lead_hours}h")
            return {"status": "UNSUPPORTED_LEAD", "predictions": None, "reason": f"Lead {lead_hours}h not in registry."}
            
        reg = self.registry[lead_hours]
        raw_precip = df_features["forecast_precip_mm"].values
        
        if reg["deployment_status"] == "FALLBACK_RAW_NWP":
            return {
                "status": "FALLBACK_RAW_NWP",
                "predictions": raw_precip,
                "reason": reg.get("fallback_reason", "Skill gate failed")
            }
            
        if lead_hours not in self.models:
            return {
                "status": "FALLBACK_RAW_NWP",
                "predictions": raw_precip,
                "reason": "Model loaded failed (e.g. checksum mismatch or missing artifact)."
            }
            
        # Validate schema
        schema = reg["feature_schema"]
        missing = [f for f in schema if f not in df_features.columns]
        if missing:
            return {
                "status": "FALLBACK_RAW_NWP",
                "predictions": raw_precip,
                "reason": f"Missing features: {missing}"
            }
            
        X = df_features[schema]
        dmatrix = xgb.DMatrix(X)
        model_type = reg["model_type"]
        transform = reg["target_transform"]
        
        try:
            if model_type == "TwoStage":
                m_occ, m_amt = self.models[lead_hours]
                prob = m_occ.predict(dmatrix)
                amt_log = m_amt.predict(dmatrix)
                # TwoStage: occurrence_probability * expm1(amount_prediction)
                # Wait: should occurrence probability be thresholded? The instructions say:
                # TwoStage: predicted_output = occurrence_probability * expm1(amount_prediction) 
                # (OR maybe use the threshold as a boolean? "occurrence_probability * ..." implies expected value. I will follow exact formula given.)
                if transform == "expected_value":
                    pred = prob * np.expm1(amt_log)
                else:
                    # If threshold is used
                    threshold = reg.get("occurrence_threshold", 0.5)
                    pred = (prob >= threshold).astype(float) * np.expm1(amt_log)
            else:
                model = self.models[lead_hours]
                raw_pred = model.predict(dmatrix)
                
                if transform == "Residual":
                    # expm1(raw_model_log_correction + log1p(raw_ecmwf))
                    pred = np.expm1(raw_pred + np.log1p(raw_precip))
                elif transform == "Direct":
                    # expm1(predicted_log)
                    pred = np.expm1(raw_pred)
                elif transform == "Quantile P50":
                    # max(predicted_value, 0)
                    pred = np.maximum(raw_pred, 0)
                else:
                    pred = raw_pred
                    
            pred = np.maximum(pred, 0) # Ensure no negative precipitation
            
            return {
                "status": "DEPLOY_CORRECTED",
                "predictions": pred,
                "reason": "Successfully applied ML bias correction"
            }
            
        except Exception as e:
            return {
                "status": "FALLBACK_RAW_NWP",
                "predictions": raw_precip,
                "reason": f"Inference error: {e}"
            }
