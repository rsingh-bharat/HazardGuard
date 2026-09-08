"""
Hydrology runoff excess unit tests.
Critical Invariant 1: Zero rainfall -> zero runoff and zero rainfall-driven impact.
"""
import unittest
from services.impact_engine.hydrology.runoff import calculate_runoff_excess
from services.impact_engine.hydrology.rainfall import normalize_rainfall

class TestRunoff(unittest.TestCase):
    def test_zero_rainfall_zero_runoff(self):
        # Critical invariant: Zero rainfall must yield zero runoff
        runoff = calculate_runoff_excess(rainfall_mm=0.0, infiltration_mm=5.0, runoff_coefficient=0.75)
        self.assertEqual(runoff, 0.0)

    def test_positive_excess_generation(self):
        # 100mm rain with 20mm infiltration and 0.65 runoff coefficient
        # excess = (100 - 20) * 0.65 = 52.0mm
        runoff = calculate_runoff_excess(rainfall_mm=100.0, infiltration_mm=20.0, runoff_coefficient=0.65)
        self.assertAlmostEqual(runoff, 52.0, places=1)

    def test_negative_excess_clamped_to_zero(self):
        # Infiltration capacity exceeds rainfall
        runoff = calculate_runoff_excess(rainfall_mm=10.0, infiltration_mm=25.0, runoff_coefficient=0.70)
        self.assertEqual(runoff, 0.0)

if __name__ == "__main__":
    unittest.main()
