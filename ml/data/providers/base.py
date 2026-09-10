"""Abstract provider interface for numerical weather prediction sources."""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ml.data.schema import CanonicalForecastRecord


@dataclass(frozen=True)
class ProviderCapabilities:
    """Explicitly tracks what a provider can support."""
    has_ensemble: bool = False
    has_historical: bool = False
    supported_lead_times_hours: List[float] = field(default_factory=list)
    variables: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class ProviderConfig:
    """Core metadata defining a forecast provider."""
    provider_id: str
    model_id: str
    source_name: str
    native_resolution: float
    forecast_interval_hours: int
    forecast_horizon_hours: int
    expected_ensemble_members: int
    run_frequency_hours: int
    capabilities: ProviderCapabilities
    provenance_metadata: Dict[str, Any] = field(default_factory=dict)


class ForecastProvider(abc.ABC):
    """Base class for all NWP and ensemble weather providers."""

    def __init__(self, config: ProviderConfig):
        self.config = config

    @property
    def provider_id(self) -> str:
        return self.config.provider_id

    @property
    def expected_members(self) -> int:
        return self.config.expected_ensemble_members

    @abc.abstractmethod
    def fetch_forecasts(
        self,
        lats: List[float],
        lons: List[float],
        start_date: str,
        end_date: str,
        lead_time_hours: Optional[List[float]] = None,
        **kwargs
    ) -> List[CanonicalForecastRecord]:
        """Fetch weather data for the specified coordinates and time range.

        Args:
            lats: List of latitudes
            lons: List of longitudes
            start_date: ISO8601 start date
            end_date: ISO8601 end date
            lead_time_hours: Optional filter for specific lead times

        Returns:
            A list of CanonicalForecastRecord instances strictly adhering to the schema.
        """
        pass
