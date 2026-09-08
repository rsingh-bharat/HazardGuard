"""
Registry for pluggable consequence handlers.
"""
from typing import Dict, List, Type
from .base import ConsequenceHandler

class ConsequenceRegistry:
    def __init__(self):
        self._handlers: Dict[str, ConsequenceHandler] = {}

    def register(self, handler: ConsequenceHandler):
        self._handlers[handler.target_type] = handler

    def get_handler(self, target_type: str) -> ConsequenceHandler:
        return self._handlers.get(target_type)

    def get_all_handlers(self) -> List[ConsequenceHandler]:
        return list(self._handlers.values())

# Global registry instance
registry = ConsequenceRegistry()
