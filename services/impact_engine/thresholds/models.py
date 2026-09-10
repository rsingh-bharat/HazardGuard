"""
Generic threshold rule data models.
"""
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any

@dataclass
class ThresholdRule:
    rule_id: str
    target_type: str  # road, drainage, facility, building
    parameter: str    # water_depth_m, utilization_ratio, access_route_max_depth_m
    operator: str     # >=, >, <=, <, ==
    threshold: float
    unit: str
    severity: str     # NORMAL, WATCH, HIGH, CRITICAL
    consequence_type: str
    title: str
    message: str
    status: str = "DATA"
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class EvaluationResult:
    triggered: bool
    rule: ThresholdRule
    current_value: float
    message_rendered: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "triggered": self.triggered,
            "rule": self.rule.to_dict(),
            "current_value": self.current_value,
            "message": self.message_rendered
        }
