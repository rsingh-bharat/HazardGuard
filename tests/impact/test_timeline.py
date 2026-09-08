"""
Timeline and temporal rainfall distribution tests.
"""
import unittest
from services.impact_engine.hydrology.temporal_distribution import generate_temporal_distribution

class TestTimeline(unittest.TestCase):
    def test_24h_3h_timestep_structure(self):
        steps = generate_temporal_distribution(total_rainfall_mm=120.0, duration_hours=24, timestep_hours=3)
        # Expected: T+0, T+3, T+6, T+9, T+12, T+15, T+18, T+21, T+24 (9 timestamps)
        self.assertEqual(len(steps), 9)
        self.assertEqual(steps[0]["timestamp"], "T+0")
        self.assertEqual(steps[-1]["timestamp"], "T+24")
        self.assertEqual(steps[-1]["hours"], 24)

    def test_cumulative_sum_conservation(self):
        total = 145.5
        steps = generate_temporal_distribution(total_rainfall_mm=total, duration_hours=24, timestep_hours=3)
        self.assertEqual(steps[0]["cumulative_mm"], 0.0)
        self.assertAlmostEqual(steps[-1]["cumulative_mm"], total, places=1)
        # Verify monotonic non-decreasing accumulation
        for i in range(1, len(steps)):
            self.assertGreaterEqual(steps[i]["cumulative_mm"], steps[i-1]["cumulative_mm"])

if __name__ == "__main__":
    unittest.main()
