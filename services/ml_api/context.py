"""Structured ScientificContext for LLM / RAG / external grounding.

The LLM must never become the source of numerical forecast truth.
This schema provides factual, deterministic ML outputs produced by the
HazardGuard scientific pipeline.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal


class ScientificContext(BaseModel):
    """Factual, machine-readable scientific context grounded in pipeline outputs."""

    snapshot_id: str = Field(..., description="Unique provenance anchor for the forecast")
    issue_time: str = Field(..., description="ISO8601 UTC timestamp of forecast creation/issue")
    latitude: float = Field(..., description="Target latitude (WGS84)")
    longitude: float = Field(..., description="Target longitude (WGS84)")
    lead_hours: int = Field(..., description="Forecast lead time in hours (24, 48, or 72)")
    
    # Numerical Forecast
    forecast_rainfall_mm: float = Field(..., ge=0.0, description="Predicted rainfall in millimeters")
    event_threshold_mm: float = Field(default=15.6, description="Authoritative IMD moderate/heavy rain threshold")
    event_probability: float = Field(..., ge=0.0, le=1.0, description="Raw uncalibrated ensemble exceedance probability")
    
    # Model Lineage & Deployment
    provider: str = Field(..., description="Data provider (e.g. open-meteo-single-runs)")
    provider_model: str = Field(..., description="Underlying NWP model (e.g. ecmwf_ifs025)")
    deployed_model_id: str = Field(..., description="HazardGuard model identifier")
    model_type: str = Field(..., description="Model architecture type (Residual or RAW)")
    model_status: str = Field(..., description="Deployment status (DEPLOY_CORRECTED or FALLBACK_RAW_NWP)")
    fallback: bool = Field(..., description="True if operating in RAW NWP fallback mode")
    fallback_reason: Optional[str] = Field(default=None, description="Reason for fallback if applicable")
    
    # Scientific Status & Disclaimers
    calibration_status: str = Field(
        default="UNCALIBRATED_RAW_ENSEMBLE",
        description="Probability calibration status (strictly uncalibrated raw ensemble)"
    )
    fss_status: str = Field(
        default="FSS_NOT_VALIDATED",
        description="Fractions Skill Score status (strictly unvalidated)"
    )
    verification_status: Literal["VERIFIED", "NOT_VALIDATED"] = Field(
        ...,
        description="Historical model verification status from offline registry (strictly VERIFIED or NOT_VALIDATED)"
    )
    
    # Meteorological Intensity (decoupled from hazard consequence)
    meteorological_intensity: str = Field(
        ...,
        description="Meteorological severity level: LOW, MODERATE, or HIGH"
    )
    meteorological_status: str = Field(
        default="COMPUTED_METEOROLOGICAL_ONLY",
        description="Explicit limitation indicating meteorological signal only"
    )
    
    # Explicitly Unavailable Hazard Dimensions (prevents hallucination)
    unavailable_hazard_models: List[str] = Field(
        default_factory=lambda: [
            "FLOOD_MODEL_UNAVAILABLE",
            "ROAD_EXPOSURE_UNAVAILABLE",
            "INFRASTRUCTURE_EXPOSURE_UNAVAILABLE",
            "POPULATION_EXPOSURE_UNAVAILABLE"
        ],
        description="Authoritative list of hazard/exposure models currently disconnected or unavailable"
    )
    
    # Optional verification metrics snapshot
    historical_metrics: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Offline historical benchmark metrics for this lead time (RMSE, CSI, etc.)"
    )
