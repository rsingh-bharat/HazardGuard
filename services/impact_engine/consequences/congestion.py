"""
Congestion risk consequence handler.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning

class CongestionConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "congestion"

    def evaluate(
        self,
        context: Any,
        raw_state: Dict[str, Any],
        threshold_rules: List[Any],
        timestamp: str,
        scenario_type: str
    ) -> ConsequenceResult:
        warnings: List[ImpactWarning] = []
        c_data = raw_state.get("congestion", {})
        score = c_data.get("congestion_score", 0.0)
        sev = c_data.get("severity", "NORMAL")

        if sev in ["HIGH", "CRITICAL"]:
            warnings.append(ImpactWarning(
                id=f"warn_cong_{timestamp}_{sev.lower()}",
                type="CONGESTION_GRIDLOCK_RISK",
                severity=sev,
                title=f"Elevated Traffic Congestion Risk ({score:.0f}/100)",
                message=c_data.get("description", "Rainfall-induced arterial bottlenecking"),
                timestamp=timestamp,
                location={"name": "District Arterial Corridors", "centroid": [77.64, 12.93]},
                trigger={"parameter": "congestion_score", "current_value": score, "threshold": 45.0, "unit": "index"},
                scenario=scenario_type,
                status="MODEL_ESTIMATED_RAINFALL_CONGESTION_RISK"
            ))

        return ConsequenceResult(
            handler_name="CongestionConsequenceHandler",
            target_type="congestion",
            severity=sev,
            warnings=warnings
        )
