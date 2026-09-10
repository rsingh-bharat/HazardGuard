"""
Validation rules for input parameters and scenarios.
"""
from typing import Optional, List
from .schemas import ImpactRequest

class ValidationError(Exception):
    def __init__(self, message: str, code: str = "INVALID_INPUT"):
        super().__init__(message)
        self.message = message
        self.code = code

def validate_impact_request(req: ImpactRequest, _raw_had_forecast: bool = True):
    # _raw_had_forecast is set False by ImpactRequest.from_dict when the caller
    # omitted the 'forecast' key entirely, preventing silent default fill-in.
    if not _raw_had_forecast:
        raise ValidationError(
            "Missing 'forecast' key in impact request payload. "
            "Payload must include a forecast object with forecast_id, state_id, district_id, bbox, and rainfall.",
            "MISSING_FORECAST"
        )
    if not req.forecast:
        raise ValidationError("Missing forecast object in impact request", "MISSING_FORECAST")
    
    rf = req.forecast.rainfall
    if rf.low_scenario_mm < 0 or rf.base_scenario_mm < 0 or rf.high_scenario_mm < 0:
        raise ValidationError("Rainfall values must be non-negative", "NEGATIVE_RAINFALL")
        
    if not (rf.low_scenario_mm <= rf.base_scenario_mm <= rf.high_scenario_mm):
        raise ValidationError(
            f"Rainfall must satisfy LOW ({rf.low_scenario_mm}) <= BASE ({rf.base_scenario_mm}) <= HIGH ({rf.high_scenario_mm})",
            "INCONSISTENT_PROBABILITY"
        )
        
    valid_scenarios = ["LOW", "BASE", "HIGH", "CUSTOM", "P10", "P50", "P90"]
    if req.scenario_type not in valid_scenarios:
        raise ValidationError(
            f"Invalid scenario_type '{req.scenario_type}'. Must be one of ['LOW', 'BASE', 'HIGH', 'CUSTOM'] (or legacy ['P10', 'P50', 'P90'])",
            "INVALID_SCENARIO"
        )
        
    if req.scenario_type == "CUSTOM":
        if req.custom_rainfall_mm is None or req.custom_rainfall_mm < 0:
            raise ValidationError(
                "CUSTOM scenario requires positive custom_rainfall_mm",
                "MISSING_CUSTOM_RAINFALL"
            )
            
    if req.duration_hours <= 0:
        raise ValidationError("duration_hours must be strictly positive", "INVALID_DURATION")
        
    if req.timestep_hours <= 0 or req.timestep_hours > req.duration_hours:
        raise ValidationError(
            f"timestep_hours ({req.timestep_hours}) must be positive and <= duration_hours ({req.duration_hours})",
            "INVALID_TIMESTEP"
        )
        
    bbox = req.bbox or req.forecast.bbox
    if not bbox or len(bbox) != 4:
        raise ValidationError("bbox must be a 4-element array [min_lon, min_lat, max_lon, max_lat]", "INVALID_BBOX")
    if bbox[0] >= bbox[2] or bbox[1] >= bbox[3]:
        raise ValidationError("bbox coordinates inverted: min must be strictly less than max", "INVALID_BBOX_COORDS")
