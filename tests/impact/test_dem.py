"""
Terrain and DEM tests.
"""
import unittest
from services.impact_engine.terrain.dem import load_dem, generate_synthetic_dem
from services.impact_engine.terrain.elevation import get_elevation_stats

class TestDEM(unittest.TestCase):
    def test_load_dem_dimensions(self):
        bbox = [77.58, 12.89, 77.695, 12.98]
        dem = load_dem(bbox, resolution_m=60.0)
        self.assertGreater(dem.rows, 5)
        self.assertGreater(dem.cols, 5)
        self.assertEqual(len(dem.elevation), dem.rows)
        self.assertEqual(len(dem.elevation[0]), dem.cols)

    def test_elevation_bounds(self):
        bbox = [77.58, 12.89, 77.695, 12.98]
        dem = load_dem(bbox, resolution_m=60.0)
        stats = get_elevation_stats(dem.elevation)
        # Bengaluru terrain ranges between ~860m and ~940m
        self.assertGreaterEqual(stats["min"], 850.0)
        self.assertLessEqual(stats["max"], 950.0)
        self.assertGreater(stats["max"], stats["min"])

if __name__ == "__main__":
    unittest.main()
