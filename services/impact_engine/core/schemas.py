"""
Data models and contracts for the Rainfall-to-Impact Engine.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple

@dataclass
class RainfallForecast:
    low_scenario_mm: float = 0.0
    base_scenario_mm: float = 0.0
    high_scenario_mm: float = 0.0

    def __init__(
        self,
        low_scenario_mm: Optional[float] = None,
        base_scenario_mm: Optional[float] = None,
        high_scenario_mm: Optional[float] = None,
        p10_mm: Optional[float] = None,
        p50_mm: Optional[float] = None,
        p90_mm: Optional[float] = None,
    ):
        self.low_scenario_mm = float(low_scenario_mm if low_scenario_mm is not None else (p10_mm if p10_mm is not None else 0.0))
        self.base_scenario_mm = float(base_scenario_mm if base_scenario_mm is not None else (p50_mm if p50_mm is not None else 0.0))
        self.high_scenario_mm = float(high_scenario_mm if high_scenario_mm is not None else (p90_mm if p90_mm is not None else 0.0))

    # Backward compatibility properties for legacy consumers
    @property
    def p10_mm(self) -> float:
        return self.low_scenario_mm

    @p10_mm.setter
    def p10_mm(self, val: float):
        self.low_scenario_mm = float(val)

    @property
    def p50_mm(self) -> float:
        return self.base_scenario_mm

    @p50_mm.setter
    def p50_mm(self, val: float):
        self.base_scenario_mm = float(val)

    @property
    def p90_mm(self) -> float:
        return self.high_scenario_mm

    @p90_mm.setter
    def p90_mm(self, val: float):
        self.high_scenario_mm = float(val)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "low_scenario_mm": self.low_scenario_mm,
            "base_scenario_mm": self.base_scenario_mm,
            "high_scenario_mm": self.high_scenario_mm,
            # Legacy aliases strictly for backward compatibility
            "p10_mm": self.low_scenario_mm,
            "p50_mm": self.base_scenario_mm,
            "p90_mm": self.high_scenario_mm,
        }

@dataclass
class ForecastSnapshot:
    forecast_id: str
    state_id: str
    district_id: str
    bbox: List[float]  # [min_lon, min_lat, max_lon, max_lat]
    rainfall: RainfallForecast
    regime: Optional[str] = "NOT_PROVIDED"
    regime_confidence: Optional[float] = None
    valid_from: str = ""
    valid_to: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ForecastSnapshot':
        rf_data = data.get("rainfall", {})
        low = rf_data.get("low_scenario_mm", rf_data.get("p10_mm", 0.0))
        base = rf_data.get("base_scenario_mm", rf_data.get("p50_mm", 0.0))
        high = rf_data.get("high_scenario_mm", rf_data.get("p90_mm", 0.0))
        rainfall = RainfallForecast(
            low_scenario_mm=float(low),
            base_scenario_mm=float(base),
            high_scenario_mm=float(high)
        )
        regime = data.get("regime", "NOT_PROVIDED")
        reg_conf = data.get("regime_confidence")
        regime_confidence = float(reg_conf) if reg_conf is not None else None

        return cls(
            forecast_id=data.get("forecast_id", "FC-DEFAULT"),
            state_id=data.get("state_id", "KA"),
            district_id=data.get("district_id", "KA_BLR_URBAN"),
            bbox=data.get("bbox", [77.58, 12.89, 77.695, 12.98]),
            rainfall=rainfall,
            regime=regime,
            regime_confidence=regime_confidence,
            valid_from=data.get("valid_from", ""),
            valid_to=data.get("valid_to", ""),
            metadata=data.get("metadata", {})
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["rainfall"] = self.rainfall.to_dict()
        return d

@dataclass
class Scenario:
    type: str  # LOW, BASE, HIGH, CUSTOM (or legacy P10, P50, P90)
    rainfall_mm: float
    duration_hours: int = 24
    timestep_hours: int = 3

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ImpactRequest:
    forecast: ForecastSnapshot
    scenario_type: str = "HIGH"  # LOW, BASE, HIGH, CUSTOM (or legacy P10, P50, P90)
    custom_rainfall_mm: Optional[float] = None
    duration_hours: int = 24
    timestep_hours: int = 3
    resolution_m: float = 30.0
    bbox: Optional[List[float]] = None
    authoritative_forecast: Optional[Dict[str, Any]] = None
    # Internal flag: was 'forecast' key explicitly present in the raw dict?
    # Used by validate_impact_request to reject silently-defaulted payloads.
    _had_explicit_forecast: bool = field(default=True, repr=False)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ImpactRequest':
        auth_forecast = data.get("authoritative_forecast", {})
        legacy_forecast = data.get("forecast", {})
        had_explicit_forecast = "forecast" in data

        # Derive impact scenarios from authoritative_forecast or legacy_forecast honestly.
        # Do NOT fabricate meteorological quantiles using arbitrary linear multipliers (e.g. 0.79/1.26).
        # If genuine quantiles or scenarios are provided, use them; otherwise, for single-value deterministic
        # forecasts, default all scenarios to the authoritative rainfall_mm.
        if auth_forecast and "rainfall_mm" in auth_forecast:
            base_mm = float(auth_forecast["rainfall_mm"])
            dist = auth_forecast.get("distribution") or {}
            
            # Check for authentic quantiles / scenarios in authoritative distribution.
            # When authoritative_forecast is present, caller/legacy payload rainfall
            # must NEVER override or replace authoritative rainfall.
            low_val = (
                dist.get("low_scenario_mm")
                or dist.get("p10_mm")
                or base_mm
            )
            base_val = (
                dist.get("base_scenario_mm")
                or dist.get("p50_mm")
                or dist.get("mean_mm")
                or base_mm
            )
            high_val = (
                dist.get("high_scenario_mm")
                or dist.get("p90_mm")
                or base_mm
            )

            legacy_forecast["rainfall"] = {
                "low_scenario_mm": round(float(low_val), 1),
                "base_scenario_mm": round(float(base_val), 1),
                "high_scenario_mm": round(float(high_val), 1),
                # Backward-compat aliases
                "p10_mm": round(float(low_val), 1),
                "p50_mm": round(float(base_val), 1),
                "p90_mm": round(float(high_val), 1)
            }

        forecast = ForecastSnapshot.from_dict(legacy_forecast)
        raw_scen = data.get("scenario_type", "HIGH").upper()
        return cls(
            forecast=forecast,
            scenario_type=raw_scen,
            custom_rainfall_mm=data.get("custom_rainfall_mm"),
            duration_hours=int(data.get("duration_hours", 24)),
            timestep_hours=int(data.get("timestep_hours", 3)),
            resolution_m=float(data.get("resolution_m", 30.0)),
            bbox=data.get("bbox") or forecast.bbox,
            authoritative_forecast=auth_forecast,
            _had_explicit_forecast=had_explicit_forecast
        )

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["forecast"] = self.forecast.to_dict()
        d.pop("_had_explicit_forecast", None)
        return d


@dataclass
class ImpactWarning:
    id: str
    type: str
    severity: str  # NORMAL, WATCH, HIGH, CRITICAL
    title: str
    message: str
    timestamp: str  # e.g., "T+15"
    location: Dict[str, Any]  # {"name": "Koramangala 80ft Rd", "lat": 12.935, "lon": 77.624}
    trigger: Dict[str, Any]  # {"current_value": 0.31, "threshold": 0.25, "unit": "m"}
    scenario: str
    status: str = "MODEL_ESTIMATE"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ImpactState:
    timestamp: str  # "T+0", "T+3", ...
    hours: int
    rainfall_accum_mm: float
    rainfall_increment_mm: float
    runoff_depth_mm: float
    water: Dict[str, Any]
    drainage: Dict[str, Any]
    roads: Dict[str, Any]
    congestion: Dict[str, Any]
    exposure: Dict[str, Any]
    warnings: List[ImpactWarning] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["warnings"] = [w.to_dict() if isinstance(w, ImpactWarning) else w for w in self.warnings]
        return d

@dataclass
class Provenance:
    forecast_id: str
    simulation_id: str
    scenario: str
    terrain_version: str
    impact_model_version: str
    threshold_version: str
    infrastructure_data_version: str
    timestamp: str
    cache_hit: bool = False
    # Sayan authoritative provenance — preserved so downstream consumers
    # can verify which ML forecast seeded this simulation.
    authoritative_snapshot_id: Optional[str] = None
    authoritative_model_id: Optional[str] = None
    authoritative_fallback: Optional[bool] = None
    authoritative_provider: Optional[str] = None
    authoritative_rainfall_mm: Optional[float] = None
    authoritative_valid_time: Optional[str] = None
    authoritative_init_time: Optional[str] = None
    authoritative_model_status: Optional[str] = None
    authoritative_verification_status: Optional[str] = None
    authoritative_probability: Optional[float] = None
    authoritative_probability_available: Optional[bool] = None
    authoritative_calibration_status: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ScenarioComparisonItem:
    scenario: str
    rainfall_mm: float
    max_depth_m: float
    affected_area_sqkm: float
    drainage_stress_ratio: float
    overflow_zones_count: int
    roads_affected_count: int
    congestion_risk_level: str
    facilities_at_risk_count: int
    population_exposed_est: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ImpactResult:
    simulation_id: str
    forecast_id: str
    scenario: Scenario
    summary: Dict[str, Any]
    timeline: List[ImpactState]
    water: Dict[str, Any]
    drainage: Dict[str, Any]
    roads: Dict[str, Any]
    exposure: Dict[str, Any]
    warnings: List[ImpactWarning]
    artifacts: Dict[str, Any]
    provenance: Provenance
    comparison: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["scenario"] = self.scenario.to_dict()
        d["timeline"] = [t.to_dict() if isinstance(t, ImpactState) else t for t in self.timeline]
        d["warnings"] = [w.to_dict() if isinstance(w, ImpactWarning) else w for w in self.warnings]
        d["provenance"] = self.provenance.to_dict()
        return d
