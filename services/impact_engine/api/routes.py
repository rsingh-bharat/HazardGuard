"""
API router functions for simulation, timeline retrieval, and layer artifacts.
Can be invoked by HTTP frameworks or direct dispatch.
"""
from typing import Dict, Any, Optional
from .dependencies import get_engine
from .errors import ImpactAPIError
from ..core.schemas import ImpactRequest
from ..core.validation import ValidationError

def handle_simulate(request_body: Dict[str, Any]) -> Dict[str, Any]:
    try:
        req = ImpactRequest.from_dict(request_body)
    except Exception as e:
        raise ImpactAPIError(f"Failed to parse impact request: {str(e)}", "MALFORMED_REQUEST", 400)

    engine = get_engine()
    try:
        result = engine.simulate(req)
        return result.to_dict()
    except ValidationError as ve:
        raise ImpactAPIError(ve.message, ve.code, 422)
    except Exception as e:
        raise ImpactAPIError(f"Simulation failure: {str(e)}", "SIMULATION_ERROR", 500)

def handle_get_simulation(simulation_id: str) -> Dict[str, Any]:
    engine = get_engine()
    sim = engine.get_simulation(simulation_id)
    if not sim:
        raise ImpactAPIError(f"Simulation '{simulation_id}' not found", "NOT_FOUND", 404)
    return sim.to_dict()

def handle_get_timeline(simulation_id: str) -> Dict[str, Any]:
    engine = get_engine()
    sim = engine.get_simulation(simulation_id)
    if not sim:
        raise ImpactAPIError(f"Simulation '{simulation_id}' not found", "NOT_FOUND", 404)
    return {
        "simulation_id": simulation_id,
        "scenario": sim.scenario.to_dict(),
        "timeline": [t.to_dict() for t in sim.timeline]
    }

def handle_get_layers(simulation_id: str) -> Dict[str, Any]:
    engine = get_engine()
    sim = engine.get_simulation(simulation_id)
    if not sim:
        raise ImpactAPIError(f"Simulation '{simulation_id}' not found", "NOT_FOUND", 404)
    return {
        "simulation_id": simulation_id,
        "scenario": sim.scenario.to_dict(),
        "artifacts": sim.artifacts
    }
