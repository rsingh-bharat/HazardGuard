import json
import math
from pathlib import Path
from typing import Optional, Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from ml.config.settings import IMD_THRESHOLDS

impact_router = APIRouter()

REGISTRY_PATH = Path(__file__).resolve().parent.parent.parent / "ml" / "models" / "model_registry.json"

class RiskAssessment(BaseModel):
    risk_level: str
    status: str

class HazardState(BaseModel):
    snapshot_id: str
    timestamp: str
    latitude: float
    longitude: float
    lead_hours: int
    
    # Meteorological inputs
    rainfall_mm: float
    event_probability: float
    probability_available: bool = True
    event_threshold_mm: float
    model_id: str
    model_status: str
    fallback: bool
    fallback_reason: Optional[str] = None
    verification_status: Literal["VERIFIED", "NOT_VALIDATED"]
    
    # Meteorological intensity output
    meteorological_intensity: RiskAssessment
    
    # Impact outputs
    flood_risk: RiskAssessment
    road_risk: RiskAssessment
    infrastructure_risk: RiskAssessment
    population_risk: RiskAssessment
    overall_hazard_level: RiskAssessment

class ImpactRequest(BaseModel):
    snapshot_id: str
    timestamp: str
    latitude: float
    longitude: float
    lead_hours: int
    rainfall_mm: float
    event_probability: float
    probability_available: bool = True
    event_threshold_mm: Optional[float] = None
    model_id: str
    model_status: str
    fallback: bool
    fallback_reason: Optional[str] = None
    verification_status: Literal["VERIFIED", "NOT_VALIDATED"]

    @classmethod
    def from_snapshot(
        cls,
        snapshot: Any,
        event_probability: float,
        verification_status: Literal["VERIFIED", "NOT_VALIDATED"],
        probability_available: bool = True
    ) -> "ImpactRequest":
        """Factory constructor ensuring strict 1:1 provenance handoff from a ForecastSnapshot."""
        return cls(
            snapshot_id=getattr(snapshot, "snapshot_id", snapshot["snapshot_id"] if isinstance(snapshot, dict) else ""),
            timestamp=getattr(snapshot, "timestamp", snapshot["timestamp"] if isinstance(snapshot, dict) else ""),
            latitude=getattr(snapshot, "latitude", snapshot["latitude"] if isinstance(snapshot, dict) else 0.0),
            longitude=getattr(snapshot, "longitude", snapshot["longitude"] if isinstance(snapshot, dict) else 0.0),
            lead_hours=getattr(snapshot, "lead_hours", snapshot["lead_hours"] if isinstance(snapshot, dict) else 24),
            rainfall_mm=getattr(snapshot, "rainfall_mm", snapshot["rainfall_mm"] if isinstance(snapshot, dict) else 0.0),
            event_probability=event_probability,
            probability_available=probability_available,
            event_threshold_mm=IMD_THRESHOLDS["MODERATE"],
            model_id=getattr(snapshot, "model_id", snapshot["model_id"] if isinstance(snapshot, dict) else ""),
            model_status=getattr(snapshot, "model_status", snapshot["model_status"] if isinstance(snapshot, dict) else ""),
            fallback=getattr(snapshot, "fallback", snapshot["fallback"] if isinstance(snapshot, dict) else False),
            fallback_reason=getattr(snapshot, "fallback_reason", snapshot.get("fallback_reason") if isinstance(snapshot, dict) else None),
            verification_status=verification_status
        )

    @field_validator("event_probability")
    @classmethod
    def validate_probability(cls, v: float) -> float:
        if not math.isfinite(v) or v < 0.0 or v > 1.0:
            raise ValueError(f"event_probability must be finite and within [0.0, 1.0], got {v}")
        return v

    @field_validator("event_threshold_mm")
    @classmethod
    def validate_threshold(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            expected = IMD_THRESHOLDS["MODERATE"]
            if abs(v - expected) > 1e-6:
                raise ValueError(
                    f"event_threshold_mm override rejected. Authoritative threshold is {expected} mm."
                )
        return v

def _get_registry_entry(lead_hours: int) -> Optional[dict]:
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            registry = json.load(f)
        for entry in registry:
            if int(entry.get("lead", -1)) == lead_hours:
                return entry
    except Exception:
        pass
    return None

@impact_router.post(
    "/ml/impact",
    response_model=HazardState,
    summary="Compute downstream meteorological hazard impact state",
    description=(
        "Consumes scientific forecast snapshot & probability inputs and returns "
        "a decoupled meteorological intensity classification alongside strictly unavailable "
        "consequence models (flood, landslide, exposure) to prevent ungrounded inferences."
    )
)
def get_impact(request: ImpactRequest):
    # Authoritative operational event threshold (15.6 mm per IMD_THRESHOLDS['MODERATE'])
    authoritative_threshold = IMD_THRESHOLDS["MODERATE"]

    # Validate / enforce authoritative snapshot metadata against registry
    model_status = request.model_status
    fallback = request.fallback
    fallback_reason = request.fallback_reason
    model_id = request.model_id

    reg_entry = _get_registry_entry(request.lead_hours)
    if reg_entry:
        authoritative_deployment_status = reg_entry.get("deployment_status")
        # Enforce that if registry mandates fallback (e.g. 48h and 72h FALLBACK_RAW_NWP),
        # a caller cannot silently upgrade to DEPLOY_CORRECTED.
        if authoritative_deployment_status == "FALLBACK_RAW_NWP" and model_status == "DEPLOY_CORRECTED":
            model_status = "FALLBACK_RAW_NWP"
            fallback = True
            fallback_reason = reg_entry.get("fallback_reason") or "Registry mandates fallback: No ML candidate passed safety gate."
            model_id = reg_entry.get("model_id", model_id)

    # Missing exposure data dimensions must explicitly return DATA_UNAVAILABLE
    unavailable_risk = RiskAssessment(risk_level="UNKNOWN", status="DATA_UNAVAILABLE")
    road_risk = unavailable_risk
    infrastructure_risk = unavailable_risk
    population_risk = unavailable_risk
    
    # Evaluate meteorological intensity
    # Probability Sentinel Safety:
    # When probability_available is False, event_probability (0.0 sentinel) must NOT be consumed
    # as a real 0% probability. Classify intensity from rainfall alone.
    if not request.probability_available:
        if request.rainfall_mm >= authoritative_threshold:
            intensity_level = "MODERATE"
        else:
            intensity_level = "LOW"
        met_status = "COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE"
    else:
        if request.rainfall_mm >= authoritative_threshold:
            if request.event_probability >= 0.5:
                intensity_level = "HIGH"
            else:
                intensity_level = "MODERATE"
        else:
            intensity_level = "LOW"
        met_status = "COMPUTED_METEOROLOGICAL_ONLY"
        
    met_intensity = RiskAssessment(
        risk_level=intensity_level,
        status=met_status
    )
    
    # Scientific integrity: flood and landslide risk cannot be inferred from rainfall alone.
    flood_risk = RiskAssessment(
        risk_level="UNKNOWN",
        status="FLOOD_MODEL_UNAVAILABLE"
    )
    # Overall hazard level is explicitly marked as meteorological signal only.
    overall_hazard_level = RiskAssessment(
        risk_level=intensity_level,
        status="METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS" if request.probability_available else "METEOROLOGICAL_SIGNAL_ONLY_PROBABILITY_UNAVAILABLE"
    )
    
    return HazardState(
        snapshot_id=request.snapshot_id,
        timestamp=request.timestamp,
        latitude=request.latitude,
        longitude=request.longitude,
        lead_hours=request.lead_hours,
        rainfall_mm=request.rainfall_mm,
        event_probability=request.event_probability,
        probability_available=request.probability_available,
        event_threshold_mm=authoritative_threshold,
        model_id=model_id,
        model_status=model_status,
        fallback=fallback,
        fallback_reason=fallback_reason,
        verification_status=request.verification_status,
        meteorological_intensity=met_intensity,
        flood_risk=flood_risk,
        road_risk=road_risk,
        infrastructure_risk=infrastructure_risk,
        population_risk=population_risk,
        overall_hazard_level=overall_hazard_level
    )
