"""
Road disruption consequence handler.
Evaluates road water depth against thresholds and outputs disruption warnings.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning
from ..thresholds.evaluator import evaluate_threshold

class RoadConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "road"

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

        road_evals = raw_state.get("roads", {}).get("road_evaluations", [])
        rules = [r for r in threshold_rules if r.target_type == "road"]
        # Sort rules descending by threshold to match most severe first
        rules.sort(key=lambda r: r.threshold, reverse=True)

        for road in road_evals:
            water_depth = road.get("water_depth_m", 0.0)
            rid = road["road_id"]

            for rule in rules:
                res = evaluate_threshold(rule, water_depth, {"road_name": road["name"]})
                if res.triggered:
                    warning_id = f"warn_rd_{rid}_{timestamp}_{rule.severity.lower()}"
                    cap_reduction = road.get("capacity_reduction_factor", 0.0)
                    
                    warnings.append(ImpactWarning(
                        id=warning_id,
                        type=rule.consequence_type,
                        severity=rule.severity,
                        title=f"{rule.title}: {road['name']}",
                        message=f"Water depth: {water_depth:.2f}m (threshold {rule.threshold:.2f}m). Capacity reduction: {int(cap_reduction*100)}%. Status: {road.get('status', 'RESTRICTED')}.",
                        timestamp=timestamp,
                        location={
                            "name": road["name"],
                            "road_id": rid,
                            "importance": road.get("importance", "MEDIUM"),
                            "coordinates": road.get("geometry", {}).get("coordinates", [])[0] if road.get("geometry", {}).get("coordinates") else [0, 0]
                        },
                        trigger={
                            "parameter": "water_depth_m",
                            "current_value": round(water_depth, 3),
                            "threshold": rule.threshold,
                            "unit": "m",
                            "capacity_reduction_pct": round(cap_reduction * 100, 1)
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
                    break  # Emit only highest triggered rule for this road

        return ConsequenceResult(
            handler_name="RoadConsequenceHandler",
            target_type="road",
            severity=highest_sev,
            warnings=warnings
        )
