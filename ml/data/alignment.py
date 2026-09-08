"""Alignment module to strictly pair forecast and observation records."""

from __future__ import annotations

from typing import Dict, List, Tuple

from ml.config.settings import DATASET_VERSION
from ml.data.normalizer import parse_iso_utc
from ml.data.schema import (
    CanonicalAlignedPair,
    CanonicalForecastRecord,
    CanonicalObservationRecord,
)


class ForecastObservationAligner:
    """Strictly aligns forecast grids to observational truth grids ensuring causality."""

    def __init__(self, dataset_version: str = DATASET_VERSION):
        self.dataset_version = dataset_version

    def align(
        self,
        forecasts: List[CanonicalForecastRecord],
        observations: List[CanonicalObservationRecord],
        enforce_causality: bool = True,
    ) -> List[CanonicalAlignedPair]:
        """Align datasets strictly on (grid_id, valid_time)."""
        obs_map: Dict[Tuple[str, str], CanonicalObservationRecord] = {}
        for obs in observations:
            key = (obs.grid_id, obs.valid_time)
            obs_map[key] = obs

        aligned_pairs: List[CanonicalAlignedPair] = []

        for fcst in forecasts:
            # Causality check
            if enforce_causality and fcst.initialization_time is not None:
                t_init = parse_iso_utc(fcst.initialization_time)
                t_valid = parse_iso_utc(fcst.valid_time)
                if t_init > t_valid:
                    raise ValueError(
                        f"Temporal causality violation: initialization_time ({fcst.initialization_time}) "
                        f"is after valid_time ({fcst.valid_time})"
                    )

            key = (fcst.grid_id, fcst.valid_time)
            obs = obs_map.get(key)
            if obs is None:
                # No ground truth available for this grid and valid time: skip strictly without imputation
                continue

            lead_str = f"lead{int(fcst.lead_time_hours):03d}h" if fcst.lead_time_hours is not None else "lead_unknown"
            pair_id = f"{fcst.grid_id}_{fcst.valid_time}_{lead_str}"

            pair = CanonicalAlignedPair(
                pair_id=pair_id,
                dataset_version=self.dataset_version,
                source_forecast=fcst.source,
                source_observation=obs.source,
                initialization_time=fcst.initialization_time,
                valid_time=fcst.valid_time,
                lead_time_hours=fcst.lead_time_hours,
                ingestion_time_forecast=fcst.ingestion_time,
                ingestion_time_observation=obs.ingestion_time,
                latitude=fcst.latitude,
                longitude=fcst.longitude,
                grid_id=fcst.grid_id,
                forecast_rainfall_mm=fcst.forecast_rainfall_mm,
                observed_rainfall_mm=obs.observed_rainfall_mm,
                reference_rainfall_mm=obs.reference_rainfall_mm,
                ensemble_stats=fcst.ensemble_stats,
                surface_pressure_hpa=fcst.surface_pressure_hpa,
                wind_speed_kmh=fcst.wind_speed_kmh,
                wind_direction_deg=fcst.wind_direction_deg,
                temperature_celsius=fcst.temperature_celsius,
                relative_humidity_percent=fcst.relative_humidity_percent,
                provenance_forecast=fcst.provenance,
                provenance_observation=obs.provenance,
            )
            aligned_pairs.append(pair)

        # Deterministic chronological sort
        aligned_pairs.sort(
            key=lambda p: (
                p.valid_time,
                p.lead_time_hours,
                p.latitude,
                p.longitude,
            )
        )
        return aligned_pairs

    @staticmethod
    def chronological_split(
        pairs: List[CanonicalAlignedPair],
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
    ) -> Tuple[List[CanonicalAlignedPair], List[CanonicalAlignedPair], List[CanonicalAlignedPair]]:
        """Split aligned pairs chronologically into Train, Validation, and Locked Test sets."""
        if not pairs:
            return [], [], []

        if not (0.0 < train_ratio < 1.0) or not (0.0 <= val_ratio < 1.0):
            raise ValueError(f"Invalid split ratios: train={train_ratio}, val={val_ratio}")
        if train_ratio + val_ratio >= 1.0:
            raise ValueError("train_ratio + val_ratio must be strictly less than 1.0 to leave test data")

        # Ensure strict sort by valid_time
        sorted_pairs = sorted(
            pairs,
            key=lambda p: (
                p.valid_time,
                p.lead_time_hours,
                p.latitude,
                p.longitude,
            ),
        )

        n = len(sorted_pairs)
        train_idx = int(n * train_ratio)
        val_idx = train_idx + int(n * val_ratio)

        train_set = sorted_pairs[:train_idx]
        val_set = sorted_pairs[train_idx:val_idx]
        test_set = sorted_pairs[val_idx:]

        return train_set, val_set, test_set
