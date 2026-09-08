import pytest
from datetime import datetime, timezone
import numpy as np

def extract_utc_day(hourly_data, target_date_str):
    times = hourly_data.get("time", [])
    if not times:
        return None
    start_str = f"{target_date_str}T00:00"
    end_str = f"{target_date_str}T23:00"
    try:
        start_idx = times.index(start_str)
        end_idx = times.index(end_str)
        if end_idx - start_idx == 23:
            return start_idx, end_idx + 1
    except ValueError:
        pass
    return None

def test_utc_alignment_for_06Z_run():
    """Verify that a run initialized at 06:00Z correctly aligns a +24h relative target day 
    to the next UTC calendar day's 00:00 - 24:00 period."""
    
    # Simulate a forecast initialized at 2026-06-01T06:00
    times = [f"2026-06-01T{h:02d}:00" for h in range(6, 24)]
    times += [f"2026-06-02T{h:02d}:00" for h in range(0, 24)]
    times += [f"2026-06-03T{h:02d}:00" for h in range(0, 24)]
    
    # Target +24h (which for a 06Z run means the NEXT calendar day, Day 2)
    indices = extract_utc_day({"time": times}, "2026-06-02")
    
    assert indices is not None
    start_idx, end_idx = indices
    
    # Verify the indices correspond exactly to the UTC calendar day
    assert times[start_idx] == "2026-06-02T00:00"
    assert times[end_idx - 1] == "2026-06-02T23:00"
    assert (end_idx - start_idx) == 24
    
    # Verify strict lead time calculation
    init_dt = datetime.strptime("2026-06-01T06:00Z", "%Y-%m-%dT%H:%M%z")
    target_start_dt = datetime.strptime("2026-06-02T00:00:00Z", "%Y-%m-%dT%H:%M:%S%z")
    lead_time_hours = (target_start_dt - init_dt).total_seconds() / 3600.0
    
    # From 06:00 to 00:00 next day is exactly 18 hours.
    assert lead_time_hours == 18.0

def test_utc_alignment_for_00Z_run():
    times = [f"2026-06-01T{h:02d}:00" for h in range(0, 24)]
    times += [f"2026-06-02T{h:02d}:00" for h in range(0, 24)]
    
    indices = extract_utc_day({"time": times}, "2026-06-02")
    assert indices is not None
    start_idx, end_idx = indices
    assert times[start_idx] == "2026-06-02T00:00"
    
    init_dt = datetime.strptime("2026-06-01T00:00Z", "%Y-%m-%dT%H:%M%z")
    target_start_dt = datetime.strptime("2026-06-02T00:00:00Z", "%Y-%m-%dT%H:%M:%S%z")
    lead_time_hours = (target_start_dt - init_dt).total_seconds() / 3600.0
    assert lead_time_hours == 24.0
