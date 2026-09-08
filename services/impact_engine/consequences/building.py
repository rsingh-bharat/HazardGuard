"""
Building exposure consequence handler.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning

class BuildingConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "building"

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

        exp = raw_state.get("exposure", {})
        bld_data = exp.get("buildings", {})
        buildings_list = bld_data.get("buildings", [])

        for b in buildings_list:
            depth = b.get("estimated_ground_water_depth_m", 0.0)
            sev = b.get("severity", "NORMAL")
            if sev in ["HIGH", "CRITICAL"]:
                bid = b["building_id"]
                warnings.append(ImpactWarning(
                    id=f"warn_bld_{bid}_{timestamp}",
                    type="BUILDING_BASEMENT_GROUND_EXPOSURE",
                    severity=sev,
                    title=f"Building Inundation Exposure: {b['name']}",
                    message=f"Ground floor and perimeter standing water reached {depth:.2f}m. Sub-grade equipment & parking exposure risk.",
                    timestamp=timestamp,
                    location={"name": b["name"], "building_id": bid, "coordinates": b.get("coordinates", [0, 0])},
                    trigger={"parameter": "water_depth_m", "current_value": depth, "threshold": 0.20, "unit": "m"},
                    scenario=scenario_type,
                    status="MODEL_ESTIMATE_BUILDING_EXPOSURE"
                ))
                if sev == "CRITICAL":
                    highest_sev = "CRITICAL"
                elif sev == "HIGH" and highest_sev != "CRITICAL":
                    highest_sev = "HIGH"

        return ConsequenceResult(
            handler_name="BuildingConsequenceHandler",
            target_type="building",
            severity=highest_sev,
            warnings=warnings
        )
