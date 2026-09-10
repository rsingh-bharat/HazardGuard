"""High-level canonical dataset loader for WeatherNext 2, observations, and hindcast benchmarks."""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional, Tuple

from ml.config.settings import PipelineConfig
from ml.data.alignment import ForecastObservationAligner
from ml.data.schema import (
    CanonicalAlignedPair,
    CanonicalForecastRecord,
    CanonicalObservationRecord,
)
from ml.data.weathernext_ingest import WeatherNextIngestor


class CanonicalDataLoader:
    """Unified interface for loading, normalizing, and aligning WeatherNext 2 and reference data."""

    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or PipelineConfig()
        self.fcst_ingestor = WeatherNextIngestor(
            dataset_version=self.config.dataset_version,
            expected_members=self.config.expected_ensemble_members,
            enforce_india_bounds=self.config.enforce_india_bounds,
        )
        self.aligner = ForecastObservationAligner(
            dataset_version=self.config.dataset_version
        )
