from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Any, Dict, Optional, List
import os
import uuid
import datetime
import math
import pandas as pd
import logging
import json
from pathlib import Path
import sys

# Ensure the hazardguard root is the highest priority in PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from services.ml_api.impact import impact_router

from ml.model_loader import BiasCorrectorModel
from ml.data.providers.factory import get_default_provider, get_provider
from ml.features.extractor import FeatureExtractor

logger = logging.getLogger(__name__)

REGISTRY_PATH = Path(__file__).resolve().parent.parent.parent / "ml" / "models" / "model_registry.json"



app = FastAPI(
    title="HazardGuard Scientific Forecast & Impact API",
    description=(
        "Authoritative scientific ML microservice for SIH26080. "
        "Provides numerical rainfall forecasting, raw uncalibrated ensemble probability, "
        "offline model verification benchmarks, and decoupled meteorological impact classification."
    ),
    version="1.0.0"
)
app.include_router(impact_router)

# Initialize models
try:
    loader = BiasCorrectorModel()
except Exception as e:
    logger.error(f"Failed to initialize BiasCorrectorModel: {e}")
    loader = None

try:
    provider = get_default_provider()
except Exception as e:
    logger.error(f"Failed to initialize provider: {e}")
    provider = None

class ForecastRequest(BaseModel):
    """External request to generate a numerical rainfall forecast."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees (WGS84)")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees (WGS84)")
    lead_time: int = Field(..., description="Lead time in hours. Must be 24, 48, or 72.")
    provider: Optional[str] = Field(default=None, description="Optional upstream NWP provider: ecmwf_ifs or weathernext3_statistics")

    @field_validator("lead_time")
    @classmethod
    def validate_lead_time(cls, v):
        if v not in [24, 48, 72]:
            raise ValueError("Unsupported lead time. Must be 24, 48, or 72.")
        return v

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v):
        if v is not None and v not in ("ecmwf_ifs", "weathernext3_statistics"):
            raise ValueError(f"Unsupported provider: '{v}'. Must be 'ecmwf_ifs' or 'weathernext3_statistics'.")
        return v


class ForecastSnapshot(BaseModel):
    """Authoritative snapshot object and single provenance anchor for downstream ML outputs."""
    snapshot_id: str = Field(..., description="Unique UUID for this forecast run")
    timestamp: str = Field(..., description="ISO8601 UTC timestamp of forecast issue/evaluation")
    latitude: float = Field(..., description="Target latitude")
    longitude: float = Field(..., description="Target longitude")
    lead_hours: int = Field(..., description="Forecast lead time in hours")
    accumulation_hours: float = Field(default=24.0, description="Accumulation window in hours")
    provider: str = Field(..., description="Upstream NWP provider source name")
    provider_model: str = Field(..., description="Provider model identifier (e.g. ecmwf_ifs025)")
    nwp_valid_time: Optional[str] = Field(default=None, description="Actual valid time of the upstream NWP forecast record (ISO8601 UTC)")
    nwp_initialization_time: Optional[str] = Field(
        default=None,
        description="NWP model initialization/run time if provided by upstream source; null for Open-Meteo because Open-Meteo does not expose model run/initialization cycle."
    )
    model_id: str = Field(..., description="Deployed HazardGuard model ID or RAW_NWP")
    model_type: str = Field(..., description="Model architecture type (Residual or RAW)")
    rainfall_mm: float = Field(..., ge=0.0, description="Predicted accumulated rainfall in mm over lead/accumulation window")
    raw_nwp_mm: Optional[float] = Field(default=None, ge=0.0, description="Unmodified RAW NWP rainfall prediction")
    model_status: str = Field(..., description="Deployment status: DEPLOY_CORRECTED or FALLBACK_RAW_NWP")
    fallback: bool = Field(..., description="True if operating in RAW NWP fallback mode")
    fallback_reason: Optional[str] = Field(default=None, description="Detailed explanation if fallback occurred")
    ml_correction_applied: bool = Field(default=True, description="True if ML correction was applied or evaluated")
    ml_correction_status: Optional[str] = Field(default=None, description="Detailed ML correction status")
    feature_schema: Optional[List[str]] = Field(default=None, description="Feature names expected by deployed model")
    distribution_type: str = Field(default="SINGLE_VALUE", description="Distribution type: SINGLE_VALUE or ENSEMBLE_STATISTICS")
    statistics_quality: Optional[str] = Field(default=None, description="Quality indicator: MARGINAL_QUANTILE_ONLY, FULL_ENSEMBLE, etc.")
    run_id: Optional[str] = Field(default=None, description="NWP run ID if available")
    run_status: Optional[str] = Field(default=None, description="NWP run status: HISTORICAL, LATEST_AVAILABLE, STALE/NOT_CURRENT")
    init_time_source: Optional[str] = Field(default=None, description="Source of initialization time")
    distribution: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Forecast distribution metadata (SINGLE_VALUE or ENSEMBLE_STATISTICS with genuine percentiles)"
    )


@app.post(
    "/ml/forecast",
    response_model=ForecastSnapshot,
    summary="Generate numerical rainfall forecast snapshot",
    description=(
        "Fetches upstream NWP data, extracts features, evaluates ML bias-correction model "
        "if deployed (+24h Residual), or enforces safety gate fallback to RAW NWP (+48h, +72h). "
        "Returns an authoritative ForecastSnapshot anchoring all downstream probability and impact calls. "
        "NOTE: Regime-aware routing (RegimeClassifier) is NOT currently operationally active or deployed; "
        "deployment follows the authoritative model_registry.json lead-time safety gate."
    )
)
def get_forecast(request: ForecastRequest):
    req_provider_id = request.provider or "ecmwf_ifs"
    if req_provider_id == "weathernext3_statistics":
        try:
            active_provider = get_provider("weathernext3_statistics")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize WeatherNext provider: {e}")
    else:
        if provider is None:
            raise HTTPException(status_code=500, detail="Forecast provider not initialized.")
        active_provider = provider

    now = datetime.datetime.now(datetime.timezone.utc)
    start_date = now.strftime("%Y-%m-%d")
    end_date = (now + datetime.timedelta(days=4)).strftime("%Y-%m-%d")

    try:
        records = active_provider.fetch_forecasts(
            lats=[request.latitude],
            lons=[request.longitude],
            start_date=start_date,
            end_date=end_date,
            lead_time_hours=[float(request.lead_time)]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Provider failure: {str(e)}")

    if not records:
        raise HTTPException(status_code=404, detail="No forecast data found for the requested parameters.")

    record = records[0]

    raw_valid_time = getattr(record, "valid_time", None)
    nwp_valid_time = str(raw_valid_time) if isinstance(raw_valid_time, str) else None
    raw_init_time = getattr(record, "initialization_time", None)
    nwp_init_time = str(raw_init_time) if isinstance(raw_init_time, str) else None

    prov = getattr(record, "provenance", None)
    raw_run_id = getattr(prov, "run_id", None) if prov else None
    run_id = raw_run_id if isinstance(raw_run_id, str) else None
    raw_run_status = getattr(prov, "run_status", None) if prov else None
    run_status = raw_run_status if isinstance(raw_run_status, str) else None
    raw_init_source = getattr(prov, "init_time_source", None) if prov else None
    init_time_source = raw_init_source if isinstance(raw_init_source, str) else None

    dist_dict = None
    dist_obj = getattr(record, "distribution", None)
    if dist_obj is not None:
        if isinstance(dist_obj, dict):
            dist_dict = dist_obj
        elif hasattr(dist_obj, "to_dict") and callable(dist_obj.to_dict):
            dist_res = dist_obj.to_dict()
            if isinstance(dist_res, dict):
                dist_dict = dist_res

    # Branch by provider
    if req_provider_id == "weathernext3_statistics":
        # WeatherNext 3 path:
        # WEATHERNEXT IS NOT A FALLBACK.
        # XGBoost correction is skipped because required features are unavailable.
        # rainfall_mm is canonical accumulated sum of hourly means.
        rainfall_mm = float(record.forecast_rainfall_mm)
        model_id = "RAW_WEATHERNEXT3"
        model_type = "RAW"
        model_status = "RAW_NWP_WEATHERNEXT3"
        fallback = False
        fallback_reason = None
        ml_correction_applied = False
        ml_correction_status = "NOT_APPLIED_INCOMPATIBLE_FEATURE_SCHEMA"
        feature_schema = None
        provider_name = "WeatherNext3"
        distribution_type = "ENSEMBLE_STATISTICS"
        statistics_quality = "MARGINAL_QUANTILE_ONLY"
        accumulation_hours = float(request.lead_time)
    else:
        # Operational ECMWF path (preserve existing behavior byte-for-byte)
        if loader is None:
            raise HTTPException(status_code=500, detail="Model loader not initialized.")

        try:
            features_dict = FeatureExtractor.extract_features(record)
            
            # Map FeatureExtractor output to model schema expectations
            if "forecastRainfallMm" in features_dict:
                features_dict["forecast_precip_mm"] = features_dict["forecastRainfallMm"]
                
            doy = features_dict.get("day_of_year", 1)
            features_dict["sin_day_of_year"] = math.sin(doy * 2 * math.pi / 365.25)
            features_dict["cos_day_of_year"] = math.cos(doy * 2 * math.pi / 365.25)
            
            ws_kmh = features_dict.get("windSpeedKmh", float('nan'))
            wd_deg = features_dict.get("windDirectionDeg", float('nan'))
            if not pd.isna(ws_kmh) and not pd.isna(wd_deg):
                ws_ms = ws_kmh / 3.6
                wd_rad = wd_deg * math.pi / 180.0
                features_dict["wind_u"] = ws_ms * math.cos(wd_rad)
                features_dict["wind_v"] = ws_ms * math.sin(wd_rad)
            
            # Do not silently fabricate features. If missing, let the ML loader catch it safely.
            if "temperatureCelsius" in features_dict and not pd.isna(features_dict["temperatureCelsius"]):
                features_dict["forecast_temperature"] = features_dict["temperatureCelsius"]
            if "relativeHumidityPercent" in features_dict and not pd.isna(features_dict["relativeHumidityPercent"]):
                features_dict["forecast_relative_humidity"] = features_dict["relativeHumidityPercent"]
            if "surfacePressureHpa" in features_dict and not pd.isna(features_dict["surfacePressureHpa"]):
                features_dict["forecast_surface_pressure"] = features_dict["surfacePressureHpa"]
            if "cloudCoverPercent" in features_dict and not pd.isna(features_dict["cloudCoverPercent"]):
                features_dict["forecast_cloud_cover"] = features_dict["cloudCoverPercent"]
            elif "forecast_cloud_cover" in features_dict and not pd.isna(features_dict["forecast_cloud_cover"]):
                pass
                
            df_features = pd.DataFrame([features_dict])
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Feature extraction failure: {str(e)}")

        try:
            result = loader.predict(float(request.lead_time), df_features)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Model loader failure: {str(e)}")

        status = result.get("status")
        predictions = result.get("predictions")
        reason = result.get("reason")
        
        if predictions is None or len(predictions) == 0:
            raise HTTPException(status_code=500, detail="Model loader returned no predictions.")

        val = float(predictions[0])
        if not math.isfinite(val) or val < 0.0:
            raise HTTPException(status_code=502, detail="ML Model produced invalid non-finite prediction.")
        rainfall_mm = val
        
        reg = loader.registry.get(float(request.lead_time), {})
        model_id = reg.get("model_id", "RAW_NWP")
        model_type = reg.get("model_type", "RAW")
        feature_schema = reg.get("feature_schema", None)
        model_status = status
        
        fallback = (status == "FALLBACK_RAW_NWP")
        fallback_reason = reason if fallback else None
        ml_correction_applied = not fallback
        ml_correction_status = "APPLIED_RESIDUAL_XGBOOST" if not fallback else "FALLBACK_SAFETY_GATE"
        provider_name = active_provider.provider_id
        distribution_type = "SINGLE_VALUE"
        statistics_quality = None
        accumulation_hours = float(request.lead_time)

    snapshot = ForecastSnapshot(
        snapshot_id=str(uuid.uuid4()),
        timestamp=now.isoformat(),
        latitude=request.latitude,
        longitude=request.longitude,
        lead_hours=request.lead_time,
        accumulation_hours=accumulation_hours,
        provider=provider_name,
        provider_model=active_provider.config.model_id,
        nwp_valid_time=nwp_valid_time,
        nwp_initialization_time=nwp_init_time,
        model_id=model_id,
        model_type=model_type,
        rainfall_mm=rainfall_mm,
        raw_nwp_mm=features_dict.get("forecast_precip_mm") if 'features_dict' in locals() and features_dict is not None else float(record.forecast_rainfall_mm),
        model_status=model_status,
        fallback=fallback,
        fallback_reason=fallback_reason,
        ml_correction_applied=ml_correction_applied,
        ml_correction_status=ml_correction_status,
        feature_schema=feature_schema,
        distribution_type=distribution_type,
        statistics_quality=statistics_quality,
        run_id=run_id,
        run_status=run_status,
        init_time_source=init_time_source,
        distribution=dist_dict
    )
    
    return snapshot


class ProbabilityResponse(BaseModel):
    """Response containing event exceedance probability derived from ensemble members."""
    snapshot_id: str = Field(..., description="Originating ForecastSnapshot ID")
    timestamp: str = Field(..., description="Timestamp matching the snapshot issue time")
    latitude: float = Field(..., description="Target latitude matching snapshot")
    longitude: float = Field(..., description="Target longitude matching snapshot")
    lead_hours: int = Field(..., description="Forecast lead time matching snapshot")
    event_definition: str = Field(default="rainfall >= 15.6 mm", description="Meteorological event definition")
    threshold_mm: float = Field(default=15.6, description="Authoritative IMD threshold in mm")
    probability: Optional[float] = Field(default=None, description="Raw ensemble exceedance probability in [0, 1]")
    probability_available: bool = Field(default=True, description="True if genuine raw ensemble members are available")
    calibration_status: str = Field(
        default="UNCALIBRATED_RAW_ENSEMBLE",
        description="Explicit calibration status declaration (strictly uncalibrated)"
    )
    ensemble_member_count: int = Field(..., description="Number of perturbed ensemble members evaluated")
    historical_positive_event_count: Optional[int] = Field(default=None, description="Null for uncalibrated raw ensembles")
    source: str = Field(..., description="Provider source name")
    model_metadata: str = Field(..., description="Provider model ID")
    model_status: str = Field(..., description="Model status propagated from originating snapshot")
    fallback_status: str = Field(
        default="No validated calibration artifact available; exposing raw ensemble probability.",
        description="Detailed explanation of calibration limitation"
    )
    ensemble_cache_status: str = Field(
        default="CACHE_MISS_RUN_IDENTITY_NOT_GUARANTEED",
        description=(
            "Indicates provider cache reuse semantics. CACHE_REUSED indicates request parameters matched "
            "locally cached provider response; CACHE_MISS_RUN_IDENTITY_NOT_GUARANTEED indicates provider "
            "re-fetch where upstream NWP model run cycle cannot be proven identical."
        )
    )
    ensemble_quality: str = Field(
        default="FULL",
        description="Ensemble calculation quality indicator: FULL for healthy members in [0.0, 1.0], or INVALID if raw calculation was anomalous."
    )


@app.post(
    "/ml/probability",
    response_model=ProbabilityResponse,
    summary="Compute heavy-rain exceedance probability from snapshot",
    description=(
        "Evaluates the probability of rainfall exceeding 15.6 mm (IMD Moderate) "
        "using raw perturbed ensemble members. Status is strictly UNCALIBRATED_RAW_ENSEMBLE. "
        "NOTE: Regime-aware routing (RegimeClassifier) is NOT currently operationally active or deployed."
    )
)
def get_probability(snapshot: ForecastSnapshot):
    try:
        now = datetime.datetime.fromisoformat(snapshot.timestamp.replace("Z", "+00:00"))
    except Exception:
        now = datetime.datetime.now(datetime.timezone.utc)

    # Scientific Integrity for WeatherNext 3 / Marginal Quantile providers:
    # Raw 64-member ensemble is unavailable in spatial statistics.
    # Exceedance probability cannot be evaluated; return probability_available=False
    # with probability=0.0 sentinel and UNAVAILABLE_NO_RAW_ENSEMBLE_WEATHERNEXT3.
    if snapshot.provider in ("WeatherNext3", "weathernext3_statistics") or snapshot.statistics_quality == "MARGINAL_QUANTILE_ONLY":
        return ProbabilityResponse(
            snapshot_id=snapshot.snapshot_id,
            timestamp=now.isoformat(),
            latitude=snapshot.latitude,
            longitude=snapshot.longitude,
            lead_hours=snapshot.lead_hours,
            event_definition="rainfall >= 15.6 mm",
            threshold_mm=15.6,
            probability=0.0,
            probability_available=False,
            calibration_status="UNAVAILABLE_NO_RAW_ENSEMBLE_WEATHERNEXT3",
            ensemble_member_count=0,
            historical_positive_event_count=None,
            source=snapshot.provider,
            model_metadata=snapshot.provider_model,
            model_status=snapshot.model_status,
            fallback_status="Raw ensemble members are not available in WeatherNext 3 spatial statistics dataset; heavy rain exceedance probability cannot be computed.",
            ensemble_cache_status="NOT_APPLICABLE_NO_RAW_ENSEMBLE",
            ensemble_quality="UNAVAILABLE"
        )

    if provider is None:
        raise HTTPException(status_code=500, detail="Forecast provider not initialized.")
    start_date = now.strftime("%Y-%m-%d")
    end_date = (now + datetime.timedelta(days=4)).strftime("%Y-%m-%d")

    # Determine whether the request is cached in the provider disk cache
    cache_status = "CACHE_MISS_RUN_IDENTITY_NOT_GUARANTEED"
    try:
        cache_dir = getattr(provider, "cache_dir", None)
        provider_id = getattr(provider, "provider_id", getattr(getattr(provider, "config", None), "provider_id", "ecmwf_ifs"))
        if cache_dir and os.path.exists(cache_dir):
            import hashlib
            params = {
                "latitude": str(snapshot.latitude),
                "longitude": str(snapshot.longitude),
                "models": provider.config.model_id,
                "hourly": "precipitation,temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover",
                "start_date": start_date,
                "end_date": end_date,
                "timezone": "UTC"
            }
            sorted_params = tuple(sorted((k, str(v)) for k, v in params.items()))
            req_hash = hashlib.md5(str(sorted_params).encode("utf-8")).hexdigest()
            cache_file = os.path.join(cache_dir, f"{provider_id}_{req_hash}.json")
            if os.path.exists(cache_file):
                cache_status = "CACHE_REUSED"
    except Exception:
        pass

    try:
        records = provider.fetch_forecasts(
            lats=[snapshot.latitude],
            lons=[snapshot.longitude],
            start_date=start_date,
            end_date=end_date,
            lead_time_hours=[float(snapshot.lead_hours)]
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Provider failure: {str(e)}")
    if not records:
        raise HTTPException(status_code=404, detail="No forecast data found for the requested parameters.")
    record = records[0]
    if record.ensemble_stats is None:
        raise HTTPException(status_code=500, detail="Provider did not return ensemble statistics.")
    raw_prob = record.ensemble_stats.exceedance_probabilities.get("p_ge_15_6mm", 0.0)

    # Validate quality of raw ensemble probability
    if not math.isfinite(raw_prob) or raw_prob < 0.0 or raw_prob > 1.0:
        ensemble_quality = "INVALID"
        prob = None
        prob_available = False
    else:
        ensemble_quality = "FULL"
        prob = max(0.0, min(1.0, raw_prob))
        prob_available = True

    return ProbabilityResponse(
        snapshot_id=snapshot.snapshot_id,
        timestamp=now.isoformat(),
        latitude=snapshot.latitude,
        longitude=snapshot.longitude,
        lead_hours=snapshot.lead_hours,
        event_definition="rainfall >= 15.6 mm",
        threshold_mm=15.6,
        probability=prob,
        probability_available=prob_available,
        calibration_status="UNCALIBRATED_RAW_ENSEMBLE",
        ensemble_member_count=record.ensemble_stats.perturbed_member_count,
        historical_positive_event_count=None,
        source=provider.config.source_name,
        model_metadata=provider.config.model_id,
        model_status=snapshot.model_status,
        fallback_status="No validated calibration artifact available; exposing raw ensemble probability.",
        ensemble_cache_status=cache_status,
        ensemble_quality=ensemble_quality
    )


class VerificationResponse(BaseModel):
    """Historical model verification metrics and skill benchmark scores."""
    snapshot_id: str = Field(..., description="Originating ForecastSnapshot ID")
    timestamp: str = Field(..., description="Timestamp matching snapshot")
    latitude: float = Field(..., description="Target latitude matching snapshot")
    longitude: float = Field(..., description="Target longitude matching snapshot")
    lead_hours: int = Field(..., description="Forecast lead time matching snapshot")
    provider: str = Field(..., description="Provider source name")
    provider_model: str = Field(..., description="Provider model ID")
    model_id: str = Field(..., description="Authoritative deployed model ID from registry")
    model_status: str = Field(..., description="Model status propagated from snapshot")
    baseline_model: str = Field(default="RAW_NWP", description="Baseline benchmark comparison model")
    RMSE: Optional[float] = Field(default=None, description="Root Mean Square Error on test set")
    MAE: Optional[float] = Field(default=None, description="Mean Absolute Error on test set")
    Bias: Optional[float] = Field(default=None, description="Mean Bias on test set")
    CSI: Optional[float] = Field(default=None, description="Critical Success Index for heavy rain (>=64.5mm)")
    POD: Optional[float] = Field(default=None, description="Probability of Detection for heavy rain")
    FAR: Optional[float] = Field(default=None, description="False Alarm Ratio for heavy rain")
    FSS: Optional[float] = Field(default=None, description="Fractions Skill Score (strictly None)")
    FSS_status: str = Field(default="FSS_NOT_VALIDATED", description="FSS validation status (strictly unvalidated)")
    verification_status: str = Field(..., description="VERIFIED or NOT_VALIDATED")
    sample_metadata: Optional[dict] = Field(default=None, description="Test sample counts and positive event counts")

def get_registry_metrics(lead_hours: int) -> tuple[dict, dict]:
    try:
        with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
            registry = json.load(f)
        for entry in registry:
            if int(entry.get('lead', -1)) == lead_hours:
                # Authoritative deployed model type from registry
                if entry.get('deployment_status') == 'DEPLOY_CORRECTED':
                    metrics_key = entry.get('model_type', 'RAW')
                else:
                    metrics_key = 'RAW'
                if metrics_key not in entry.get('metrics', {}):
                    metrics_key = 'RAW'
                return entry.get('metrics', {}).get(metrics_key, {}), entry
    except Exception:
        pass
    return {}, {}

@app.post(
    "/ml/verification",
    response_model=VerificationResponse,
    summary="Retrieve offline verification metrics for snapshot lead time",
    description=(
        "Returns authoritative offline test-set verification metrics (RMSE, MAE, Bias, CSI, POD, FAR) "
        "derived from model_registry.json. FSS is strictly marked FSS_NOT_VALIDATED."
    )
)
def get_verification(snapshot: ForecastSnapshot):
    metrics, entry = get_registry_metrics(snapshot.lead_hours)
    
    if not metrics:
        v_status = "NOT_VALIDATED"
    else:
        v_status = "VERIFIED"

    # FSS is strictly NOT_VALIDATED per requirements
    fss_status = "FSS_NOT_VALIDATED"
    
    return VerificationResponse(
        snapshot_id=snapshot.snapshot_id,
        timestamp=snapshot.timestamp,
        latitude=snapshot.latitude,
        longitude=snapshot.longitude,
        lead_hours=snapshot.lead_hours,
        provider=snapshot.provider,
        provider_model=snapshot.provider_model,
        model_id=snapshot.model_id,
        model_status=snapshot.model_status,
        baseline_model="RAW_NWP",
        RMSE=metrics.get("rmse"),
        MAE=metrics.get("mae"),
        Bias=metrics.get("bias"),
        CSI=metrics.get("heavy_csi"),
        POD=metrics.get("heavy_pod"),
        FAR=metrics.get("heavy_far"),
        FSS=None,
        FSS_status=fss_status,
        verification_status=v_status,
        sample_metadata={"heavy_events": metrics.get("heavy_events"), "test_samples": entry.get("row_counts", {}).get("test")} if metrics else None
    )
