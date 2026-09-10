"""
Generic threshold engine evaluation tests.
Invariants:
- Below threshold -> no warning
- Threshold crossing -> warning
"""
import unittest
from services.impact_engine.thresholds.models import ThresholdRule
from services.impact_engine.thresholds.evaluator import evaluate_threshold
from services.impact_engine.thresholds.severity import get_highest_severity, compare_severity

class TestThresholds(unittest.TestCase):
    def setUp(self):
        self.rule = ThresholdRule(
            rule_id="test_road_depth",
            target_type="road",
            parameter="water_depth_m",
            operator=">=",
            threshold=0.25,
            unit="m",
            severity="HIGH",
            consequence_type="ROAD_PARTIAL_DISRUPTION",
            title="Severe Road Disruption",
            message="Water depth {value:.2f}m exceeded threshold {threshold:.2f}m"
        )

    def test_below_threshold_no_warning(self):
        # 0.18m is below 0.25m threshold
        res = evaluate_threshold(self.rule, 0.18)
        self.assertFalse(res.triggered)

    def test_threshold_crossing_triggers_warning(self):
        # 0.31m crosses 0.25m threshold
        res = evaluate_threshold(self.rule, 0.31)
        self.assertTrue(res.triggered)
        self.assertIn("0.31m", res.message_rendered)

    def test_severity_hierarchy(self):
        sevs = ["NORMAL", "WATCH", "CRITICAL", "HIGH"]
        self.assertEqual(get_highest_severity(sevs), "CRITICAL")
        self.assertGreater(compare_severity("HIGH", "WATCH"), 0)
        self.assertLess(compare_severity("WATCH", "CRITICAL"), 0)

if __name__ == "__main__":
    unittest.main()
