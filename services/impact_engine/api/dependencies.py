"""
Dependency injection for impact engine.
"""
from ..core.engine import ImpactEngine

_engine_instance: ImpactEngine = None

def get_engine() -> ImpactEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = ImpactEngine()
    return _engine_instance
