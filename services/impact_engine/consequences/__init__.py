"""
Consequence handler registry initialization.
"""
from .base import ConsequenceHandler, ConsequenceResult
from .registry import registry
from .drainage import DrainageConsequenceHandler
from .sewer import SewerConsequenceHandler
from .road import RoadConsequenceHandler
from .congestion import CongestionConsequenceHandler
from .facility_access import FacilityAccessConsequenceHandler
from .building import BuildingConsequenceHandler
from .population import PopulationConsequenceHandler

# Auto-register all handlers
registry.register(DrainageConsequenceHandler())
registry.register(SewerConsequenceHandler())
registry.register(RoadConsequenceHandler())
registry.register(CongestionConsequenceHandler())
registry.register(FacilityAccessConsequenceHandler())
registry.register(BuildingConsequenceHandler())
registry.register(PopulationConsequenceHandler())
