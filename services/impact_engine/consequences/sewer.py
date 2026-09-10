"""
Sewer and combined surcharge consequence handler.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning

class SewerConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "sewer"

    def evaluate(
        self,
        context: Any,
        raw_state: Dict[str, Any],
        threshold_rules: List[Any],
        timestamp: str,
        scenario_type: str
    ) -> ConsequenceResult:
        warnings: List[ImpactWarning] = []
        drainage_data = raw_state.get("drainage", {})
        overflow_zones = drainage_data.get("overflow_zones", [])

        # When drainage utilization is CRITICAL (>=1.05), combined sewer backflow is flagged
        for oz in overflow_zones:
            if oz.get("severity") == "CRITICAL":
                zid = oz["zone_id"]
                warnings.append(ImpactWarning(
                    id=f"warn_sew_{zid}_{timestamp}",
                    type="SEWER_BACKFLOW_RISK",
                    severity="CRITICAL",
                    title="Potential Storm Sewer Backflow Risk",
                    message=f"Model-estimated manhole surcharge in {oz['name']}. Potential wastewater backflow risk into subterranean lines.",
                    timestamp=timestamp,
                    location={"name": oz["name"], "zone_id": zid, "centroid": oz.get("centroid", [0, 0])},
                    trigger={"current_value": oz["utilization_ratio"], "threshold": 1.05, "unit": "ratio"},
                    scenario=scenario_type,
                    status="SCENARIO_BASED_ESTIMATE"
                ))

        return ConsequenceResult(
            handler_name="SewerConsequenceHandler",
            target_type="sewer",
            severity="CRITICAL" if warnings else "NORMAL",
            warnings=warnings
        )
