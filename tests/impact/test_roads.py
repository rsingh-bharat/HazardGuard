"""
Road exposure, capacity reduction, and bottleneck identification tests.
"""
import unittest
from services.impact_engine.traffic.capacity_reduction import calculate_capacity_reduction
from services.impact_engine.traffic.bottleneck import identify_bottlenecks

class TestRoads(unittest.TestCase):
    def test_capacity_reduction_stepped_response(self):
        # 0.05m -> Free flow (0% reduction)
        r_free = calculate_capacity_reduction(0.05)
        self.assertEqual(r_free["capacity_reduction_factor"], 0.0)
        self.assertEqual(r_free["severity"], "NORMAL")

        # 0.18m -> Speed reduction (15-35% reduction)
        r_watch = calculate_capacity_reduction(0.18)
        self.assertGreaterEqual(r_watch["capacity_reduction_factor"], 0.15)
        self.assertEqual(r_watch["severity"], "WATCH")

        # 0.30m -> High disruption (50-85% reduction)
        r_high = calculate_capacity_reduction(0.30)
        self.assertGreaterEqual(r_high["capacity_reduction_factor"], 0.50)
        self.assertEqual(r_high["severity"], "HIGH")

        # 0.45m -> Critical closure
        r_crit = calculate_capacity_reduction(0.45)
        self.assertEqual(r_crit["capacity_reduction_factor"], 0.95)
        self.assertEqual(r_crit["severity"], "CRITICAL")

    def test_bottleneck_choke_detection(self):
        road_evals = [
            {
                "road_id": "RD_CRIT",
                "name": "Arterial Ring Road",
                "importance": "CRITICAL",
                "capacity_reduction_factor": 0.55,
                "water_depth_m": 0.28
            },
            {
                "road_id": "RD_LOCAL",
                "name": "Side Alley",
                "importance": "LOW",
                "capacity_reduction_factor": 0.20,
                "water_depth_m": 0.12
            }
        ]
        b_list = identify_bottlenecks(road_evals)
        self.assertEqual(len(b_list), 1)
        self.assertEqual(b_list[0]["road_id"], "RD_CRIT")

if __name__ == "__main__":
    unittest.main()
