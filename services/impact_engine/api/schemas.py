"""
API request and response contracts.
"""
from typing import Dict, Any, List, Optional
from ..core.schemas import ImpactRequest, ImpactResult

def serialize_simulation_response(result: ImpactResult) -> Dict[str, Any]:
    return result.to_dict()
