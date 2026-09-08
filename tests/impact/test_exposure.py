"""
Critical asset, facility access, and population exposure tests.
"""
import unittest
from services.impact_engine.exposure.hospitals import evaluate_hospital_access
from services.impact_engine.exposure.buildings import evaluate_building_exposure
from services.impact_engine.exposure.population import estimate_population_exposure

class TestExposure(unittest.TestCase):
    def test_hospital_access_cutoff_even_if_compound_dry(self):
        # Hospital compound is dry (0.02m), but connecting feeder road has 0.38m water
        hospitals = [{
            "facility_id": "HOSP_1",
            "name": "General Trauma Center",
            "type": "HOSPITAL",
            "coordinates": [77.62, 12.93],
            "access_road_id": "FEEDER_RD_1",
            "criticality": "EXTREME"
        }]
        # Dry compound in water grid
        water_grid = [[0.02 for _ in range(5)] for _ in range(5)]
        road_evals = [{
            "road_id": "FEEDER_RD_1",
            "water_depth_m": 0.38
        }]
        bbox = [77.60, 12.90, 77.65, 12.95]

        res = evaluate_hospital_access(hospitals, water_grid, road_evals, bbox)
        self.assertEqual(len(res), 1)
        # Even though direct water depth is minimal, access risk must be CRITICAL
        self.assertEqual(res[0]["access_risk_level"], "CRITICAL")
        self.assertEqual(res[0]["status"], "ACCESS_CUT_OFF_OR_DIRECT_FLOOD")

    def test_building_exposure_ground_depth(self):
        buildings = [{
            "building_id": "B1",
            "name": "Tech Office Tower",
            "use": "COMMERCIAL",
            "coordinates": [77.62, 12.93]
        }]
        water_grid = [[0.28 for _ in range(5)] for _ in range(5)]
        bbox = [77.60, 12.90, 77.65, 12.95]

        res = evaluate_building_exposure(buildings, water_grid, bbox)
        self.assertEqual(res["exposed_count"], 1)
        self.assertEqual(res["buildings"][0]["severity"], "HIGH")

    def test_population_exposure_estimation(self):
        cells = [{"ward": "Ward A", "density_per_km2": 15000, "area_km2": 2.0, "lon": 77.62, "lat": 12.93}]
        water_grid = [[0.22 for _ in range(5)] for _ in range(5)]
        bbox = [77.60, 12.90, 77.65, 12.95]

        res = estimate_population_exposure(cells, water_grid, bbox)
        self.assertGreater(res["estimated_total_population_exposure"], 0)
        self.assertIn("Scenario-based exposure estimate", res["scientific_disclaimer"])

if __name__ == "__main__":
    unittest.main()
