"""
Base interface and result model for Consequence Handlers.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any
from ..core.schemas import ImpactWarning

@dataclass
class ConsequenceResult:
    handler_name: str
    target_type: str
    severity: str
    warnings: List[ImpactWarning] = field(default_factory=list)
    state_updates: Dict[str, Any] = field(default_factory=dict)

class ConsequenceHandler(ABC):
    @property
    @abstractmethod
    def target_type(self) -> str:
        """The target domain handled (e.g. 'drainage', 'road', 'facility')."""
        pass

    @abstractmethod
    def evaluate(
        self,
        context: Any,
        raw_state: Dict[str, Any],
        threshold_rules: List[Any],
        timestamp: str,
        scenario_type: str
    ) -> ConsequenceResult:
        """Consumes context, state, and threshold rules to return consequences and warnings."""
        pass
