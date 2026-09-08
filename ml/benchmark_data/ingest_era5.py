import requests
from typing import List, Dict, Any
from ml.benchmark_data.schema import BenchmarkObservation
from ml.data.normalizer import format_grid_id
from datetime import datetime, timezone, timedelta

class ERA5HistoricalProvider:
    BASE_URL = "https://archive-api.open-meteo.com/v1/archive"

    def fetch(self, lats: List[float], lons: List[float], start_date: str, end_date: str) -> List[Dict]:
        # We need to fetch hourly precipitation and sum it into 24-hour windows ending at 00Z.
        # So we fetch from start_date - 1 day to end_date to ensure we have the preceding 24h.
        
        start_dt = datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)
        extended_start = start_dt.strftime("%Y-%m-%d")
        
        params = {
            "latitude": ",".join(map(str, lats)),
            "longitude": ",".join(map(str, lons)),
            "start_date": extended_start,
            "end_date": end_date,
            "hourly": "precipitation",
            "models": "era5",
            "timezone": "UTC"
        }
        
        r = requests.get(self.BASE_URL, params=params)
        r.raise_for_status()
        data = r.json()
        
        # If multiple points, Open-Meteo returns a list of dicts. If single, a single dict.
        responses = data if isinstance(data, list) else [data]
        
        results = []
        for i, resp in enumerate(responses):
            lat = lats[i] if i < len(lats) else resp["latitude"]
            lon = lons[i] if i < len(lons) else resp["longitude"]
            times = resp["hourly"]["time"]
            precip = resp["hourly"]["precipitation"]
            
            # Map time to precipitation
            hourly_map = {t: p for t, p in zip(times, precip) if p is not None}
            
            # Form 24-hour accumulations ending at 00Z for the target dates
            curr = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            
            while curr <= end:
                valid_iso = curr.strftime("%Y-%m-%dT00:00")
                accum = 0.0
                valid = True
                
                # 24h leading up to valid_time
                for h in range(24):
                    t_str = (curr - timedelta(hours=23 - h)).strftime("%Y-%m-%dT%H:00")
                    if t_str in hourly_map:
                        accum += hourly_map[t_str]
                    else:
                        valid = False
                        break
                        
                if valid:
                    # Append result
                    results.append({
                        "latitude": lat,
                        "longitude": lon,
                        "valid_time": curr.replace(tzinfo=timezone.utc).isoformat(),
                        "precipitation_24h": accum
                    })
                curr += timedelta(days=1)
                
        return results
