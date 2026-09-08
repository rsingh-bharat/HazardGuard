"""
Drainage load, capacity, utilization, and surcharge tests.
"""
import unittest
from services.impact_engine.drainage.capacity import get_zone_capacity
from services.impact_engine.drainage.load import calculate_drainage_load
from services.impact_engine.drainage.utilization import calculate_utilization
from services.impact_engine.drainage.surcharge import evaluate_surcharge
from services.impact_engine.drainage.overflow import identify_overflow_risk

class TestDrainage(unittest.TestCase):
    def setUp(self):
        self.zone = {
            "zone_id": "TEST_ZONE",
            "name": "Test Trunk Drain",
            "catchment_area_km2": 3.6,
            "design_capacity_m3_s": 25.0
        }

    def test_utilization_calculation(self):
        # Rational flow: Q = (0.7 * 30mm/hr * 3.6km2) / 3.6 = 21.0 m3/s
        load = calculate_drainage_load(self.zone, rainfall_intensity_mm_hr=30.0, runoff_coefficient=0.7)
        self.assertEqual(load, 21.0)
        util = calculate_utilization(load, 25.0)
        self.assertAlmostEqual(util, 0.84, places=2)

    def test_surcharge_status_watch_and_critical(self):
        normal_surch = evaluate_surcharge(0.50)
        self.assertEqual(normal_surch["severity"], "NORMAL")

        high_surch = evaluate_surcharge(0.95)
        self.assertEqual(high_surch["severity"], "HIGH")

        crit_surch = evaluate_surcharge(1.15)
        self.assertEqual(crit_surch["severity"], "CRITICAL")

    def test_overflow_risk_flagged(self):
        zones = [self.zone]
        utils = {"TEST_ZONE": 1.10}
        overflows = identify_overflow_risk(zones, utils)
        self.assertEqual(len(overflows), 1)
        self.assertEqual(overflows[0]["severity"], "CRITICAL")
        self.assertEqual(overflows[0]["risk_label"], "POTENTIAL_OVERFLOW_RISK")

if __name__ == "__main__":
    unittest.main()
