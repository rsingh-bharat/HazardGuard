"""
Unit tests for scenario resolution and validation.
"""
import unittest
from services.impact_engine.core.schemas import ForecastSnapshot, RainfallForecast, ImpactRequest
from services.impact_engine.core.scenario import resolve_scenario
from services.impact_engine.core.validation import validate_impact_request, ValidationError

class TestScenario(unittest.TestCase):
    def setUp(self):
        self.forecast = ForecastSnapshot(
            forecast_id="FC-TEST",
            state_id="KA",
            district_id="KA_BLR",
            bbox=[77.58, 12.89, 77.69, 12.98],
            rainfall=RainfallForecast(low_scenario_mm=30.0, base_scenario_mm=75.0, high_scenario_mm=150.0)
        )

    def test_p10_resolution(self):
        req = ImpactRequest(forecast=self.forecast, scenario_type="LOW")
        scen = resolve_scenario(req)
        self.assertEqual(scen.type, "LOW")
        self.assertEqual(scen.rainfall_mm, 30.0)

    def test_p50_resolution(self):
        req = ImpactRequest(forecast=self.forecast, scenario_type="BASE")
        scen = resolve_scenario(req)
        self.assertEqual(scen.type, "BASE")
        self.assertEqual(scen.rainfall_mm, 75.0)

    def test_p90_resolution(self):
        req = ImpactRequest(forecast=self.forecast, scenario_type="HIGH")
        scen = resolve_scenario(req)
        self.assertEqual(scen.type, "HIGH")
        self.assertEqual(scen.rainfall_mm, 150.0)

    def test_custom_resolution(self):
        req = ImpactRequest(forecast=self.forecast, scenario_type="CUSTOM", custom_rainfall_mm=120.0)
        scen = resolve_scenario(req)
        self.assertEqual(scen.type, "CUSTOM")
        self.assertEqual(scen.rainfall_mm, 120.0)

    def test_invalid_negative_rainfall(self):
        bad_fc = ForecastSnapshot(
            forecast_id="FC-BAD",
            state_id="KA",
            district_id="KA_BLR",
            bbox=[77.58, 12.89, 77.69, 12.98],
            rainfall=RainfallForecast(low_scenario_mm=-5.0, base_scenario_mm=20.0, high_scenario_mm=50.0)
        )
        req = ImpactRequest(forecast=bad_fc, scenario_type="LOW")
        with self.assertRaises(ValidationError):
            validate_impact_request(req)

    def test_inconsistent_probability_ordering(self):
        bad_fc = ForecastSnapshot(
            forecast_id="FC-BAD",
            state_id="KA",
            district_id="KA_BLR",
            bbox=[77.58, 12.89, 77.69, 12.98],
            rainfall=RainfallForecast(low_scenario_mm=100.0, base_scenario_mm=50.0, high_scenario_mm=150.0)
        )
        req = ImpactRequest(forecast=bad_fc, scenario_type="BASE")
        with self.assertRaises(ValidationError):
            validate_impact_request(req)

if __name__ == "__main__":
    unittest.main()
