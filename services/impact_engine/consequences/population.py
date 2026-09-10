"""
Population exposure consequence handler.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning

class PopulationConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "population"

    def evaluate(
        self,
        context: Any,
        raw_state: Dict[str, Any],
        threshold_rules: List[Any],
        timestamp: str,
        scenario_type: str
    ) -> ConsequenceResult:
        warnings: List[ImpactWarning] = []
        pop_data = raw_state.get("exposure", {}).get("population", {})
        total_exposed = pop_data.get("estimated_total_population_exposure", 0)

        if total_exposed >= 10000:
            sev = "CRITICAL" if total_exposed >= 30000 else "HIGH"
            warnings.append(ImpactWarning(
                id=f"warn_pop_{timestamp}_{sev.lower()}",
                type="POPULATION_EXPOSURE_ALERT",
                severity=sev,
                title=f"High Population Exposure ({total_exposed:,} estimated)",
                message=f"Model-estimated {total_exposed:,} urban residents located in high water-depth footprint (>0.15m). Localised ward relief staging advised.",
                timestamp=timestamp,
                location={"name": "Urban Ward Aggregation", "centroid": [77.64, 12.93]},
                trigger={"parameter": "estimated_exposed_population", "current_value": float(total_exposed), "threshold": 10000.0, "unit": "residents"},
                scenario=scenario_type,
                status="SCENARIO_BASED_EXPOSURE_ESTIMATE"
            ))

        return ConsequenceResult(
            handler_name="PopulationConsequenceHandler",
            target_type="population",
            severity="HIGH" if total_exposed >= 10000 else "NORMAL",
            warnings=warnings
        )
