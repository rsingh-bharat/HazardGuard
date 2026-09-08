"""
Critical facility access consequence handler.
Flags facilities whose connecting road network or compound is compromised.
"""
from typing import List, Dict, Any
from .base import ConsequenceHandler, ConsequenceResult
from ..core.schemas import ImpactWarning

class FacilityAccessConsequenceHandler(ConsequenceHandler):
    @property
    def target_type(self) -> str:
        return "facility_access"

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
        hospitals = exp.get("hospitals", [])

        for h in hospitals:
            risk = h.get("access_risk_level", "NORMAL")
            if risk in ["HIGH", "CRITICAL"]:
                fid = h["facility_id"]
                direct_d = h.get("direct_water_depth_m", 0.0)
                access_d = h.get("access_route_max_depth_m", 0.0)

                msg = (
                    f"Emergency ingress severely impeded for {h['name']}. "
                    f"Connecting feeder road inundated with {access_d:.2f}m water depth "
                    f"(direct compound depth: {direct_d:.2f}m)."
                )

                warnings.append(ImpactWarning(
                    id=f"warn_fac_{fid}_{timestamp}",
                    type="FACILITY_ACCESS_DISRUPTION",
                    severity=risk,
                    title=f"Access Risk: {h['name']}",
                    message=msg,
                    timestamp=timestamp,
                    location={
                        "name": h["name"],
                        "facility_id": fid,
                        "type": h.get("type", "HOSPITAL"),
                        "coordinates": h.get("coordinates", [0, 0])
                    },
                    trigger={
                        "parameter": "access_route_max_depth_m",
                        "current_value": access_d,
                        "threshold": 0.20,
                        "unit": "m",
                        "direct_depth_m": direct_d
                    },
                    scenario=scenario_type,
                    status="MODEL_ESTIMATE"
                ))

                if risk == "CRITICAL":
                    highest_sev = "CRITICAL"
                elif risk == "HIGH" and highest_sev != "CRITICAL":
                    highest_sev = "HIGH"

        return ConsequenceResult(
            handler_name="FacilityAccessConsequenceHandler",
            target_type="facility_access",
            severity=highest_sev,
            warnings=warnings
        )
