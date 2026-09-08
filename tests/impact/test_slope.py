"""
Slope calculation unit tests.
"""
import unittest
from services.impact_engine.terrain.slope import calculate_slope

class TestSlope(unittest.TestCase):
    def test_flat_terrain_zero_slope(self):
        # 3x3 uniform elevation grid
        flat_grid = [[900.0, 900.0, 900.0] for _ in range(3)]
        slopes = calculate_slope(flat_grid, cell_size_m=30.0)
        for row in slopes:
            for val in row:
                self.assertAlmostEqual(val, 0.0, places=1)

    def test_inclined_plane_positive_slope(self):
        # Elevation dropping 30m every 30m horizontally
        slanted_grid = [
            [960.0, 930.0, 900.0],
            [960.0, 930.0, 900.0],
            [960.0, 930.0, 900.0]
        ]
        slopes = calculate_slope(slanted_grid, cell_size_m=30.0)
        # Center cell should have ~45 degrees slope (atan(1) = 45 deg)
        self.assertGreater(slopes[1][1], 40.0)
        self.assertLess(slopes[1][1], 50.0)

if __name__ == "__main__":
    unittest.main()
