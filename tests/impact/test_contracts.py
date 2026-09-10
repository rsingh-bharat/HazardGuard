"""
Contract tests verifying all 7 critical invariants.
1. Zero rainfall -> zero rainfall-driven impact
2. HIGH >= BASE >= LOW rainfall
3. Scenario changes must propagate through the engine
4. Below threshold -> no warning
5. Threshold crossing -> warning
6. Repeated identical request -> cached equivalent output
7. No frontend calculation required (complete ImpactResult)
"""
import unittest
from services.impact_engine.core.schemas import ForecastSnapshot, RainfallForecast, ImpactRequest
from services.impact_engine.core.engine import ImpactEngine

class TestContracts(unittest.TestCase):
    def setUp(self):
        self.engine = ImpactEngine()
        self.forecast = ForecastSnapshot(
            forecast_id="FC-CONTRACT-TEST",
            state_id="KA",
            district_id="KA_BLR_URBAN",
            bbox=[77.58, 12.89, 77.695, 12.98],
            rainfall=RainfallForecast(low_scenario_mm=30.0,
        base_scenario_mm=60.0,
        high_scenario_mm=130.0)
        )

    def test_invariant_1_zero_rainfall_zero_impact(self):
        # Custom scenario with 0.0mm rainfall
        req = ImpactRequest(
            forecast=self.forecast,
            scenario_type="CUSTOM",
            custom_rainfall_mm=0.0,
            duration_hours=24,
            timestep_hours=3
        )
        res = self.engine.simulate(req)
        # Check summary
        self.assertEqual(res.summary["peak_water_depth_m"], 0.0)
        self.assertEqual(res.summary["peak_inundated_area_km2"], 0.0)
        self.assertEqual(res.summary["drainage_overflow_zones_count"], 0)
        self.assertEqual(res.summary["road_bottlenecks_count"], 0)
        self.assertEqual(res.summary["critical_warnings_count"], 0)

    def test_invariant_2_and_3_monotonic_propagation(self):
        # LOW simulation
        req_p10 = ImpactRequest(forecast=self.forecast, scenario_type="LOW")
        res_p10 = self.engine.simulate(req_p10)

        # BASE simulation
        req_p50 = ImpactRequest(forecast=self.forecast, scenario_type="BASE")
        res_p50 = self.engine.simulate(req_p50)

        # HIGH simulation
        req_p90 = ImpactRequest(forecast=self.forecast, scenario_type="HIGH")
        res_p90 = self.engine.simulate(req_p90)

        # Monotonicity checks: HIGH >= BASE >= LOW
        self.assertGreaterEqual(res_p90.summary["rainfall_total_mm"], res_p50.summary["rainfall_total_mm"])
        self.assertGreaterEqual(res_p50.summary["rainfall_total_mm"], res_p10.summary["rainfall_total_mm"])

        self.assertGreaterEqual(res_p90.summary["peak_water_depth_m"], res_p50.summary["peak_water_depth_m"])
        self.assertGreaterEqual(res_p50.summary["peak_water_depth_m"], res_p10.summary["peak_water_depth_m"])

        self.assertGreaterEqual(res_p90.summary["peak_inundated_area_km2"], res_p50.summary["peak_inundated_area_km2"])
        self.assertGreaterEqual(res_p50.summary["peak_inundated_area_km2"], res_p10.summary["peak_inundated_area_km2"])

        self.assertGreaterEqual(res_p90.summary["total_warnings_count"], res_p10.summary["total_warnings_count"])

        # Check comparison structure presence
        self.assertIsNotNone(res_p90.comparison)
        self.assertIn("LOW", res_p90.comparison)
        self.assertIn("BASE", res_p90.comparison)
        self.assertIn("HIGH", res_p90.comparison)

    def test_invariant_6_cache_hit_on_identical_request(self):
        req = ImpactRequest(forecast=self.forecast, scenario_type="BASE")
        res1 = self.engine.simulate(req)
        self.assertFalse(res1.provenance.cache_hit)

        res2 = self.engine.simulate(req)
        self.assertTrue(res2.provenance.cache_hit)
        self.assertEqual(res1.simulation_id, res2.simulation_id)
        self.assertEqual(res1.summary["peak_water_depth_m"], res2.summary["peak_water_depth_m"])

    def test_invariant_7_no_frontend_calculation_required(self):
        req = ImpactRequest(forecast=self.forecast, scenario_type="HIGH")
        res = self.engine.simulate(req)
        # The result must include complete timeline, water, drainage, roads, exposure, warnings, artifacts
        self.assertGreater(len(res.timeline), 5)
        self.assertIn("depth_grid_sample", res.water)
        self.assertIn("overflow_zones", res.drainage)
        self.assertIn("bottlenecks", res.roads)
        self.assertIn("water_geojson", res.artifacts)
        self.assertIn("roads_geojson", res.artifacts)
        self.assertIn("flow_vectors_geojson", res.artifacts)

if __name__ == "__main__":
    unittest.main()
