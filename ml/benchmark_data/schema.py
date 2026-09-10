from __future__ import annotations
from dataclasses import dataclass, asdict, field
from typing import Dict, Any, Optional

@dataclass(frozen=True)
class BenchmarkObservation:
    """A fully aligned and normalized observation for benchmark scoring."""
    forecast_provider: str
    model_id: str
    run_id: str
    init_time: str
    valid_time: str
    lead_time_hours: float
    latitude: float
    longitude: float
    grid_id: str
    rainfall_mm_24h: float
    reference_rainfall_mm_24h: float
    source_metadata: Dict[str, Any] = field(default_factory=dict)
    regridding_method: str = "conservative_remapping_0.1_to_0.25"
    accumulation_method: str = "24h_sum_00Z_to_00Z"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
