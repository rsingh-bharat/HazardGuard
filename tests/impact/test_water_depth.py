"""
Water depth conversion unit tests.
"""
import unittest
from services.impact_engine.hydrology.water_depth import calculate_water_depth

class TestWaterDepth(unittest.TestCase):
    def test_valley_ponding_deeper_than_slope(self):
        # Valley cell slope=0.5 deg vs Hillside cell slope=25.0 deg
        routed_grid = [[100.0, 100.0]]
        slope_grid = [[0.5, 25.0]]
        depth_grid = calculate_water_depth(routed_grid, slope_grid)
        # Flat valley should pond significantly deeper
        self.assertGreater(depth_grid[0][0], depth_grid[0][1])

    def test_zero_routed_water_yields_zero_depth(self):
        routed = [[0.0, 0.0]]
        slope = [[5.0, 10.0]]
        depth = calculate_water_depth(routed, slope)
        self.assertEqual(depth[0][0], 0.0)
        self.assertEqual(depth[0][1], 0.0)

if __name__ == "__main__":
    unittest.main()
