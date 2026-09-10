"""
Simulation context containing terrain, infrastructure, config, and state.
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from .schemas import ImpactRequest, Scenario

@dataclass
class SimulationContext:
    request: ImpactRequest
    scenario: Scenario
    bbox: List[float]
    grid_shape: tuple  # (rows, cols)
    resolution_m: float
    elevation_grid: List[List[float]]
    slope_grid: List[List[float]]
    flow_dir_grid: List[List[int]]
    drainage_zones: List[Dict[str, Any]]
    roads: List[Dict[str, Any]]
    facilities: List[Dict[str, Any]]
    schools: List[Dict[str, Any]] = field(default_factory=list)
    power: List[Dict[str, Any]] = field(default_factory=list)
    buildings: List[Dict[str, Any]] = field(default_factory=list)
    population_cells: List[Dict[str, Any]] = field(default_factory=list)
    threshold_rules: List[Dict[str, Any]] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)
