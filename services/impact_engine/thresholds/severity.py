"""
Severity scales and comparator logic.
"""
from typing import List

SEVERITY_HIERARCHY = {
    "NORMAL": 0,
    "WATCH": 1,
    "HIGH": 2,
    "CRITICAL": 3
}

SEVERITY_COLORS = {
    "NORMAL": "#10b981",
    "WATCH": "#f59e0b",
    "HIGH": "#f97316",
    "CRITICAL": "#ef4444"
}

def compare_severity(sev1: str, sev2: str) -> int:
    return SEVERITY_HIERARCHY.get(sev1, 0) - SEVERITY_HIERARCHY.get(sev2, 0)

def get_highest_severity(severities: List[str]) -> str:
    if not severities:
        return "NORMAL"
    return max(severities, key=lambda s: SEVERITY_HIERARCHY.get(s, 0))
