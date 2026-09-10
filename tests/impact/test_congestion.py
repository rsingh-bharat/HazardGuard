"""
Congestion risk engine unit tests.
"""
import unittest
from services.impact_engine.traffic.congestion import calculate_congestion_risk

class TestCongestion(unittest.TestCase):
    def test_zero_road_impact_low_congestion(self):
        road_evals = [
            {"road_id": "R1", "importance": "HIGH", "capacity_reduction_factor": 0.0},
            {"road_id": "R2", "importance": "CRITICAL", "capacity_reduction_factor": 0.0}
        ]
        res = calculate_congestion_risk(road_evals, [])
        self.assertEqual(res["congestion_score"], 0.0)
        self.assertEqual(res["severity"], "NORMAL")

    def test_severe_bottlenecks_amplify_congestion(self):
        road_evals = [
            {"road_id": "R1", "importance": "CRITICAL", "capacity_reduction_factor": 0.70},
            {"road_id": "R2", "importance": "HIGH", "capacity_reduction_factor": 0.60}
        ]
        bottlenecks = [
            {"road_id": "R1", "choke_severity": "CRITICAL"},
            {"road_id": "R2", "choke_severity": "HIGH"}
        ]
        res = calculate_congestion_risk(road_evals, bottlenecks)
        self.assertGreaterEqual(res["congestion_score"], 50.0)
        self.assertIn(res["severity"], ["HIGH", "CRITICAL"])

if __name__ == "__main__":
    unittest.main()
