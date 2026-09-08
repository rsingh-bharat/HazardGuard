"""
Temporal rainfall distribution / hyetograph synthesizer.
Generates incremental rainfall per simulation timestep according to synthetic hyetograph profiles.
"""
from typing import List, Dict, Any

def generate_temporal_distribution(total_rainfall_mm: float, duration_hours: int = 24, timestep_hours: int = 3) -> List[Dict[str, Any]]:
    """
    Returns list of timesteps with cumulative and incremental rainfall in mm.
    Uses calibrated monsoon cloudburst hyetograph peaking mid-event (T+9 to T+15).
    """
    if duration_hours <= 0 or timestep_hours <= 0:
        raise ValueError("Duration and timestep must be positive")
        
    num_steps = int(duration_hours / timestep_hours)
    
    # Fractional weights for 8 intervals (24h with 3h steps):
    # Sum of weights = 1.0. Peak intensity between T+9 and T+15.
    base_weights = [0.03, 0.08, 0.22, 0.32, 0.18, 0.09, 0.05, 0.03]
    if num_steps != len(base_weights):
        # Dynamically scale Gaussian bell curve
        import math
        weights = []
        center = num_steps * 0.45
        sigma = num_steps * 0.22
        for i in range(num_steps):
            w = math.exp(-((i - center) ** 2) / (2 * (sigma ** 2)))
            weights.append(w)
        total_w = sum(weights)
        norm_weights = [w / total_w for w in weights]
    else:
        norm_weights = base_weights

    steps: List[Dict[str, Any]] = []
    accum_mm = 0.0
    
    # T+0 is initial state (0 mm rain)
    steps.append({
        "timestamp": "T+0",
        "hours": 0,
        "incremental_mm": 0.0,
        "cumulative_mm": 0.0,
        "intensity_mm_hr": 0.0
    })
    
    for idx, w in enumerate(norm_weights):
        hours = (idx + 1) * timestep_hours
        inc = round(total_rainfall_mm * w, 2)
        accum_mm = round(accum_mm + inc, 2)
        # Prevent tiny float drift on last step
        if idx == len(norm_weights) - 1:
            inc = round(total_rainfall_mm - (accum_mm - inc), 2)
            accum_mm = round(total_rainfall_mm, 2)
            
        steps.append({
            "timestamp": f"T+{hours}",
            "hours": hours,
            "incremental_mm": max(0.0, inc),
            "cumulative_mm": accum_mm,
            "intensity_mm_hr": round(inc / timestep_hours, 2)
        })
        
    return steps
