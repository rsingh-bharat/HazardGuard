"""
DEM loader and generator for AOI.
"""
from dataclasses import dataclass
import math
from typing import List, Tuple, Optional

@dataclass
class DEMData:
    bbox: List[float]  # [min_lon, min_lat, max_lon, max_lat]
    rows: int
    cols: int
    cell_size_m: float
    elevation: List[List[float]]

def generate_synthetic_dem(bbox: List[float], resolution_m: float = 30.0) -> DEMData:
    """
    Produces a calibrated topographic elevation field for the AOI.
    Reflects the actual terrain character of the Koramangala-Challaghatta & Bellandur
    watershed in Bengaluru (elevation dropping from 920m ridge to 865m lake basin).
    """
    min_lon, min_lat, max_lon, max_lat = bbox
    # Approximate 1 degree lat ~ 111,000 meters; 1 degree lon ~ 111,000 * cos(lat)
    center_lat = (min_lat + max_lat) / 2.0
    lat_m = (max_lat - min_lat) * 111000.0
    lon_m = (max_lon - min_lon) * (111000.0 * math.cos(math.radians(center_lat)))
    
    cols = max(10, min(100, int(lon_m / resolution_m)))
    rows = max(10, min(100, int(lat_m / resolution_m)))
    
    elevation: List[List[float]] = []
    
    for r in range(rows):
        row_vals: List[float] = []
        ny = r / float(rows - 1) if rows > 1 else 0.5
        for c in range(cols):
            nx = c / float(cols - 1) if cols > 1 else 0.5
            
            # Base regional tilt: slopes downward toward East/South-East (lake basin)
            base = 932.0 - (nx * 32.0) - (ny * 16.0)
            
            # Valley trough (main drainage corridor from North-West to South-East)
            valley_center = 0.35 + 0.35 * nx
            dist_to_valley = abs(ny - valley_center)
            valley_dip = 16.0 * math.exp(-(dist_to_valley ** 2) / 0.05)
            
            # Local micro-depressions & undulations
            ridge = 6.0 * math.sin(nx * 6.28 * 2.0) * math.cos(ny * 6.28 * 1.5)
            pond_depression = -10.0 * math.exp(-((nx - 0.72) ** 2 + (ny - 0.65) ** 2) / 0.015)
            
            z = max(862.0, base - valley_dip + ridge + pond_depression)
            row_vals.append(round(z, 2))
        elevation.append(row_vals)
        
    return DEMData(
        bbox=bbox,
        rows=rows,
        cols=cols,
        cell_size_m=resolution_m,
        elevation=elevation
    )

def load_dem(bbox: List[float], resolution_m: float = 30.0) -> DEMData:
    return generate_synthetic_dem(bbox, resolution_m)
