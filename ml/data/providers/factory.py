"""Factory for selecting and instantiating forecast providers."""

from __future__ import annotations

import logging
from typing import Optional

from ml.config.settings import DATASET_VERSION
from ml.data.providers.base import ForecastProvider, ProviderCapabilities, ProviderConfig
from ml.data.providers.openmeteo import OpenMeteoEnsembleProvider
from ml.data.providers.weathernext3 import WeatherNext3StatisticsProvider

logger = logging.getLogger(__name__)

# Predefined operational provider configurations
PROVIDER_CONFIGS = {
    "weathernext2": ProviderConfig(
        provider_id="weathernext2",
        model_id="wn2_64_member",
        source_name="WeatherNext2",
        native_resolution=0.25,
        forecast_interval_hours=24,
        forecast_horizon_hours=240,
        expected_ensemble_members=64,
        run_frequency_hours=6,
        capabilities=ProviderCapabilities(has_ensemble=True, has_historical=False, variables=["precipitation"]),
        provenance_metadata={"dataset_version": DATASET_VERSION}
    ),
    "weathernext3_statistics": ProviderConfig(
        provider_id="weathernext3_statistics",
        model_id="weathernext_3_0_0_statistics",
        source_name="Google-WeatherNext3-SpatialStats",
        native_resolution=0.1,
        forecast_interval_hours=24,
        forecast_horizon_hours=360,
        expected_ensemble_members=0,  # 0 denotes precomputed spatial summary moments
        run_frequency_hours=1,
        capabilities=ProviderCapabilities(
            has_ensemble=True,
            has_historical=False,
            supported_lead_times_hours=[float(h) for h in range(1, 361)],
            variables=["total_precipitation_1hr", "temperature_2m", "wind_speed_10m", "mean_sea_level_pressure"]
        ),
        provenance_metadata={"dataset_version": DATASET_VERSION}
    ),
    "ecmwf_ifs": ProviderConfig(
        provider_id="ecmwf_ifs",
        model_id="ecmwf_ifs025",
        source_name="ECMWF-IFS-OpenMeteo",
        native_resolution=0.25,
        forecast_interval_hours=24,
        forecast_horizon_hours=360,
        expected_ensemble_members=51,
        run_frequency_hours=12,
        capabilities=ProviderCapabilities(has_ensemble=True, has_historical=False, variables=["precipitation"]),
        provenance_metadata={"dataset_version": DATASET_VERSION}
    ),
    "ecmwf_ifs_historical": ProviderConfig(
        provider_id="ecmwf_ifs_historical",
        model_id="ecmwf_ifs025",
        source_name="ECMWF-IFS-HRES-Historical",
        native_resolution=0.25,
        forecast_interval_hours=24,
        forecast_horizon_hours=360,
        expected_ensemble_members=1,
        run_frequency_hours=12,
        capabilities=ProviderCapabilities(has_ensemble=False, has_historical=True, variables=["precipitation"]),
        provenance_metadata={"dataset_version": DATASET_VERSION}
    ),
    "gefs": ProviderConfig(
        provider_id="gefs",
        model_id="gfs_seamless",
        source_name="NOAA-GEFS-OpenMeteo",
        native_resolution=0.25,
        forecast_interval_hours=24,
        forecast_horizon_hours=384,
        expected_ensemble_members=31,
        run_frequency_hours=6,
        capabilities=ProviderCapabilities(has_ensemble=True, has_historical=False, variables=["precipitation"]),
        provenance_metadata={"dataset_version": DATASET_VERSION}
    )
}

def get_provider(provider_id: str, **kwargs) -> ForecastProvider:
    """Instantiate the requested forecast provider."""
    if provider_id not in PROVIDER_CONFIGS:
        raise ValueError(f"Unknown provider_id: {provider_id}")
        
    config = PROVIDER_CONFIGS[provider_id]
    
    if provider_id == "weathernext2":
        # Placeholder for when IAM is resolved
        raise NotImplementedError("WeatherNext 2 provider requires valid IAM access which is pending.")
    elif provider_id == "weathernext3_statistics":
        return WeatherNext3StatisticsProvider(config, **kwargs)
    elif provider_id in ("ecmwf_ifs", "gefs"):
        return OpenMeteoEnsembleProvider(config, **kwargs)
    
    raise ValueError(f"No concrete implementation mapped for {provider_id}")

def get_default_provider(**kwargs) -> ForecastProvider:
    """Returns the primary operational provider (ECMWF IFS)."""
    return get_provider("ecmwf_ifs", **kwargs)
