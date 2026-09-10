"""
API error classes and structured error schemas.
"""
from typing import Dict, Any

class ImpactAPIError(Exception):
    def __init__(self, message: str, code: str = "BAD_REQUEST", status_code: int = 400, details: Any = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details

    def to_dict(self) -> Dict[str, Any]:
        d = {"error": self.message, "code": self.code}
        if self.details:
            d["details"] = self.details
        return d
