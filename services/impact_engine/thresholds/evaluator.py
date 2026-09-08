"""
Generic threshold comparison evaluator.
"""
from typing import Optional
from .models import ThresholdRule, EvaluationResult

def evaluate_threshold(rule: ThresholdRule, current_value: float, context_vars: Optional[dict] = None) -> EvaluationResult:
    op = rule.operator.strip()
    val = float(current_value)
    thresh = float(rule.threshold)

    triggered = False
    if op == ">=":
        triggered = val >= thresh
    elif op == ">":
        triggered = val > thresh
    elif op == "<=":
        triggered = val <= thresh
    elif op == "<":
        triggered = val < thresh
    elif op == "==":
        triggered = abs(val - thresh) < 1e-6

    # Render template message
    fmt_dict = {"value": val, "threshold": thresh, "unit": rule.unit}
    if context_vars:
        fmt_dict.update(context_vars)

    try:
        rendered = rule.message.format(**fmt_dict)
    except Exception:
        rendered = f"{rule.title}: {val} {rule.unit} vs threshold {thresh} {rule.unit}"

    return EvaluationResult(
        triggered=triggered,
        rule=rule,
        current_value=val,
        message_rendered=rendered
    )
