"""
Threshold rule loader from JSON configuration files.
"""
import json
import os
from typing import List, Dict, Any
from .models import ThresholdRule

def load_threshold_rules(config_dir: str) -> List[ThresholdRule]:
    rules: List[ThresholdRule] = []

    files_to_load = [
        "drainage_thresholds.json",
        "road_thresholds.json",
        "facility_thresholds.json"
    ]

    for fname in files_to_load:
        fpath = os.path.join(config_dir, fname)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                data = json.load(f)
                for r_dict in data.get("rules", []):
                    rule = ThresholdRule(
                        rule_id=r_dict["rule_id"],
                        target_type=r_dict["target_type"],
                        parameter=r_dict["parameter"],
                        operator=r_dict["operator"],
                        threshold=float(r_dict["threshold"]),
                        unit=r_dict["unit"],
                        severity=r_dict["severity"],
                        consequence_type=r_dict["consequence_type"],
                        title=r_dict.get("title", "Threshold Exceeded"),
                        message=r_dict.get("message", "Value {value} exceeded threshold {threshold}"),
                        status=r_dict.get("status", "DATA"),
                        metadata=r_dict
                    )
                    rules.append(rule)
    return rules
