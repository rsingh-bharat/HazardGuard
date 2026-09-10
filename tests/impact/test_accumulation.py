"""
Water accumulation unit tests.
"""
import unittest
from services.impact_engine.hydrology.water_accumulation import calculate_water_accumulation

class TestAccumulation(unittest.TestCase):
    def test_accumulation_metrics(self):
        # 10x10 grid with 50mm depth
        grid = [[50.0 for _ in range(10)] for _ in range(10)]
        res = calculate_water_accumulation(grid, cell_size_m=30.0)
        self.assertGreater(res["total_volume_m3"], 0.0)
        self.assertGreater(res["inundated_area_km2"], 0.0)
        self.assertEqual(res["inundation_fraction"], 1.0)

    def test_zero_water_grid(self):
        grid = [[0.0 for _ in range(5)] for _ in range(5)]
        res = calculate_water_accumulation(grid, cell_size_m=30.0)
        self.assertEqual(res["total_volume_m3"], 0.0)
        self.assertEqual(res["inundated_area_km2"], 0.0)

if __name__ == "__main__":
    unittest.main()
