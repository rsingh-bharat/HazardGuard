"""
Drainage consequence handler.
Evaluates drainage zone capacity utilization against threshold rules.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning
from ..thresholds.evaluator import evaluate_threshold

class DrainageConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "drainage"

    def evaluate(
        self,
        context: Any,
        raw_state: Dict[str, Any],
        threshold_rules: List[Any],
        timestamp: str,
        scenario_type: str
    ) -> ConsequenceResult:
        warnings: List[ImpactWarning] = []
        highest_sev = "NORMAL"

        drainage_data = raw_state.get("drainage", {})
        utilizations = drainage_data.get("utilizations", {})
        zones = context.drainage_zones

        rules = [r for r in threshold_rules if r.target_type == "drainage"]

        for zone in zones:
            zid = zone["zone_id"]
            ratio = utilizations.get(zid, 0.0)

            for rule in rules:
                res = evaluate_threshold(rule, ratio, {"zone_name": zone["name"]})
                if res.triggered:
                    warning_id = f"warn_drn_{zid}_{timestamp}_{rule.severity.lower()}"
                    warnings.append(ImpactWarning(
                        id=warning_id,
                        type=rule.consequence_type,
                        severity=rule.severity,
                        title=rule.title,
                        message=res.message_rendered,
                        timestamp=timestamp,
                        location={
                            "name": zone["name"],
                            "zone_id": zid,
                            "centroid": zone.get("centroid", [0.0, 0.0])
                        },
                        trigger={
                            "parameter": rule.parameter,
                            "current_value": round(ratio, 3),
                            "threshold": rule.threshold,
                            "unit": rule.unit
                        },
                        scenario=scenario_type,
                        status="MODEL_ESTIMATE"
                    ))
                    if rule.severity == "CRITICAL":
                        highest_sev = "CRITICAL"
                    elif rule.severity == "HIGH" and highest_sev != "CRITICAL":
                        highest_sev = "HIGH"
                    elif rule.severity == "WATCH" and highest_sev == "NORMAL":
                        highest_sev = "WATCH"

        return ConsequenceResult(
            handler_name="DrainageConsequenceHandler",
            target_type="drainage",
            severity=highest_sev,
            warnings=warnings,
            state_updates={"highest_drainage_severity": highest_sev}
        )
