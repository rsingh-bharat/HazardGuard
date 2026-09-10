"""
Terrain derivatives cache keyed by AOI + resolution + terrainVersion.
"""
from typing import Dict, Any, Optional

class TerrainCache:
    _storage: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def make_key(cls, bbox: list, resolution_m: float, terrain_version: str) -> str:
        bbox_str = "_".join(f"{coord:.4f}" for coord in bbox)
        return f"dem_{bbox_str}_{resolution_m:.1f}_{terrain_version}"

    @classmethod
    def get(cls, key: str) -> Optional[Dict[str, Any]]:
        return cls._storage.get(key)

    @classmethod
    def put(cls, key: str, data: Dict[str, Any]):
        cls._storage[key] = data

    @classmethod
    def clear(cls):
        cls._storage.clear()
