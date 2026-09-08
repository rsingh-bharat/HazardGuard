"""
Threshold evaluation engine and severity model.
"""
from .models import ThresholdRule, EvaluationResult
from .loader import load_threshold_rules
from .evaluator import evaluate_threshold
from .severity import get_highest_severity, SEVERITY_HIERARCHY, SEVERITY_COLORS
