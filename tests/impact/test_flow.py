"""
D8 flow direction and routing tests.
"""
import unittest
from services.impact_engine.terrain.flow_direction import calculate_d8_flow_direction

class TestFlow(unittest.TestCase):
    def test_steepest_descent_east(self):
        # Center cell 920 drops eastward to 900
        elev = [
            [930.0, 930.0, 930.0],
            [930.0, 920.0, 900.0],
            [930.0, 930.0, 930.0]
        ]
        flow = calculate_d8_flow_direction(elev, cell_size_m=30.0)
        # East code is 1 in D8 convention
        self.assertEqual(flow[1][1], 1)

    def test_pit_cell_zero_flow(self):
        # Center cell lower than all 8 neighbors (pit/sink)
        elev = [
            [950.0, 950.0, 950.0],
            [950.0, 890.0, 950.0],
            [950.0, 950.0, 950.0]
        ]
        flow = calculate_d8_flow_direction(elev, cell_size_m=30.0)
        self.assertEqual(flow[1][1], 0)

if __name__ == "__main__":
    unittest.main()
