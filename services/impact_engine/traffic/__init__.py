"""
Traffic and road disruption impact module.
"""
from .graph import get_road_network
from .road_attributes import get_road_attributes
from .exposure import calculate_road_water_exposure
from .capacity_reduction import calculate_capacity_reduction
from .bottleneck import identify_bottlenecks
from .congestion import calculate_congestion_risk
from .routes import evaluate_critical_routes
