"""
API handlers unit tests.
"""
import unittest
from services.impact_engine.api.routes import (
    handle_simulate,
    handle_get_simulation,
    handle_get_timeline,
    handle_get_layers
)
from services.impact_engine.api.errors import ImpactAPIError

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.valid_payload = {
            "forecast": {
                "forecast_id": "FC-API-TEST",
                "state_id": "KA",
                "district_id": "KA_BLR_URBAN",
                "bbox": [77.58, 12.89, 77.695, 12.98],
                "rainfall": {
                    "low_scenario_mm": 25.0,
                    "base_scenario_mm": 60.0,
                    "high_scenario_mm": 130.0
                }
            },
            "scenario_type": "LOW",
            "duration_hours": 24,
            "timestep_hours": 3
        }

    def test_handle_simulate_success(self):
        res = handle_simulate(self.valid_payload)
        self.assertIn("simulation_id", res)
        self.assertIn("timeline", res)
        self.assertIn("summary", res)
        self.assertIn("artifacts", res)
        sim_id = res["simulation_id"]

        # Test GET /impact/{simulationId}
        sim_record = handle_get_simulation(sim_id)
        self.assertEqual(sim_record["simulation_id"], sim_id)

        # Test GET /impact/{simulationId}/timeline
        tl = handle_get_timeline(sim_id)
        self.assertIn("timeline", tl)
        self.assertGreater(len(tl["timeline"]), 0)

        # Test GET /impact/{simulationId}/layers
        layers = handle_get_layers(sim_id)
        self.assertIn("artifacts", layers)
        self.assertIn("water_geojson", layers["artifacts"])

    def test_handle_simulate_validation_failure(self):
        bad_payload = {
            "forecast": {
                "forecast_id": "FC-BAD",
                "state_id": "KA",
                "district_id": "KA_BLR",
                "bbox": [77.58, 12.89, 77.695, 12.98],
                "rainfall": {
                    "low_scenario_mm": 120.0,
                    "base_scenario_mm": 50.0,  # Violates LOW <= BASE
                    "high_scenario_mm": 130.0
                }
            },
            "scenario_type": "BASE"
        }
        with self.assertRaises(ImpactAPIError):
            handle_simulate(bad_payload)

if __name__ == "__main__":
    unittest.main()
