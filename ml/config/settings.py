"""Pipeline configuration, meteorological thresholds, domain bounds, and version constants."""

import os
from dataclasses import dataclass
from typing import Dict, Set

# Cache Configuration
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_env_cache = os.getenv("HAZARDGUARD_CACHE_DIR")
if _env_cache:
    CACHE_DIR = os.path.abspath(_env_cache) if not os.path.isabs(_env_cache) else _env_cache
else:
    CACHE_DIR = os.path.join(_REPO_ROOT, "scratch", "openmeteo_cache")

# Dataset and pipeline specification versions
DATASET_VERSION = "1.0.0-phase1.1"
PIPELINE_VERSION = "1.0.0"

# Official IMD Rainfall Classification Thresholds (mm / 24h)
# MUST exactly match probability.ts configuration
IMD_THRESHOLDS: Dict[str, float] = {
    "VERY_LIGHT": 0.1,
    "LIGHT": 2.5,
    "MODERATE": 15.6,
    "HEAVY": 64.5,
    "VERY_HEAVY": 115.5,
    "EXTREME": 204.5,
}

# India Geographic Domain Bounding Box (WGS84)
# Latitude: 6.0°N to 38.0°N, Longitude: 68.0°E to 98.0°E
INDIA_BOUNDS: Dict[str, float] = {
    "min_lat": 6.0,
    "max_lat": 38.0,
    "min_lon": 68.0,
    "max_lon": 98.0,
}

# Supported rainfall units for normalization
SUPPORTED_UNITS: Set[str] = {"mm", "in", "inch", "inches", "cm", "m"}

# Default spatial alignment grid resolution (in decimal degrees)
# WeatherNext 2 is 0.25° natively.
DEFAULT_GRID_RESOLUTION_DEG: float = 0.25

# Expected WeatherNext 2 ensemble member count
DEFAULT_EXPECTED_ENSEMBLE_MEMBERS: int = 64


@dataclass(frozen=True)
class PipelineConfig:
    """Immutable configuration parameters for the canonical data pipeline."""

    dataset_version: str = DATASET_VERSION
    pipeline_version: str = PIPELINE_VERSION
    min_lat: float = INDIA_BOUNDS["min_lat"]
    max_lat: float = INDIA_BOUNDS["max_lat"]
    min_lon: float = INDIA_BOUNDS["min_lon"]
    max_lon: float = INDIA_BOUNDS["max_lon"]
    grid_resolution_deg: float = DEFAULT_GRID_RESOLUTION_DEG
    expected_ensemble_members: int = DEFAULT_EXPECTED_ENSEMBLE_MEMBERS
    require_ground_truth: bool = True
    enforce_india_bounds: bool = False
    allow_nan_repair: bool = False  # Strict scientific integrity: do not silently repair NaNs
