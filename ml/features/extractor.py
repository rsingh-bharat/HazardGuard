"""Feature engineering layer bridging Canonical schemas to ML inputs."""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional
from datetime import datetime
import pandas as pd

from ml.data.normalizer import parse_iso_utc
from ml.data.schema import CanonicalForecastRecord

# Feature schema version to ensure reproducibility
FEATURE_SCHEMA_VERSION = "2.0.0"

class FeatureExtractor:
    """Extracts features safely from canonical records without fabricating missing data."""
    
    @staticmethod
    def extract_features(record: CanonicalForecastRecord) -> Dict[str, Any]:
        """Convert a single CanonicalForecastRecord to a feature dictionary."""
        
        valid_dt = parse_iso_utc(record.valid_time)
        
        features: Dict[str, Any] = {
            # Metadata
            "grid_id": record.grid_id,
            "valid_time": record.valid_time,
            "initialization_time": record.initialization_time,
            "lead_time_hours": record.lead_time_hours,
            
            # Temporal
            "day_of_year": valid_dt.timetuple().tm_yday,
            "hour_of_day": valid_dt.hour,
            
            # Spatial
            "latitude": record.latitude,
            "longitude": record.longitude,
            
            # Deterministic/Control Rainfall
            "forecastRainfallMm": record.forecast_rainfall_mm,
        }
        
        # Atmospheric (Propagate None securely; xgboost handles NaN natively)
        features["surfacePressureHpa"] = record.surface_pressure_hpa if record.surface_pressure_hpa is not None else float("nan")
        features["windSpeedKmh"] = record.wind_speed_kmh if record.wind_speed_kmh is not None else float("nan")
        features["windDirectionDeg"] = record.wind_direction_deg if record.wind_direction_deg is not None else float("nan")
        features["temperatureCelsius"] = record.temperature_celsius if record.temperature_celsius is not None else float("nan")
        features["relativeHumidityPercent"] = record.relative_humidity_percent if record.relative_humidity_percent is not None else float("nan")
        features["cloudCoverPercent"] = getattr(record, "cloud_cover_percent", None) if getattr(record, "cloud_cover_percent", None) is not None else float("nan")
        
        # Ensemble Features
        stats = record.ensemble_stats
        if stats:
            features["ens_mean"] = stats.mean
            features["ens_median"] = stats.median
            features["ens_std"] = stats.std
            features["ens_p10"] = stats.p10
            features["ens_p90"] = stats.p90
            features["ens_member_count"] = stats.member_count
            features["ens_perturbed_member_count"] = stats.perturbed_member_count
            
            # Unpack exceedances safely based on existing thresholds
            features["prob_ge_15_6mm"] = stats.exceedance_probabilities.get("p_ge_15_6mm", 0.0)
            features["prob_ge_64_5mm"] = stats.exceedance_probabilities.get("p_ge_64_5mm", 0.0)
            p_115_5 = stats.exceedance_probabilities.get("p_ge_115_5mm", stats.exceedance_probabilities.get("p_ge_115_6mm", 0.0))
            features["prob_ge_115_5mm"] = p_115_5
            features["prob_ge_115_6mm"] = p_115_5
        else:
            features["ens_mean"] = float("nan")
            features["ens_median"] = float("nan")
            features["ens_std"] = float("nan")
            features["ens_p10"] = float("nan")
            features["ens_p90"] = float("nan")
            features["ens_member_count"] = 0
            features["ens_perturbed_member_count"] = 0
            features["prob_ge_15_6mm"] = 0.0
            features["prob_ge_64_5mm"] = 0.0
            features["prob_ge_115_5mm"] = 0.0
            features["prob_ge_115_6mm"] = 0.0
            
        return features

    @staticmethod
    def extract_batch(records: List[CanonicalForecastRecord]) -> pd.DataFrame:
        """Extract a batch of records into a Pandas DataFrame."""
        extracted = [FeatureExtractor.extract_features(r) for r in records]
        df = pd.DataFrame(extracted)
        return df

