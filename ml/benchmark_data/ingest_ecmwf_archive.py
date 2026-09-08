import requests
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

class ECMWFHistoricalProvider:
    BASE_URL = "https://single-runs-api.open-meteo.com/v1/forecast"

    def fetch(self, lats: List[float], lons: List[float], run_date: str, lead_time_hours: List[float]) -> List[Dict]:
        """
        run_date: YYYY-MM-DD to fetch the 00Z run for.
        """
        run_str = f"{run_date}T00:00"
        
        params = {
            "latitude": ",".join(map(str, lats)),
            "longitude": ",".join(map(str, lons)),
            "run": run_str,
            "models": "ecmwf_ifs",
            "hourly": "precipitation",
            "timezone": "UTC"
        }
        
        r = requests.get(self.BASE_URL, params=params)
        r.raise_for_status()
        data = r.json()
        
        responses = data if isinstance(data, list) else [data]
        
        results = []
        for i, resp in enumerate(responses):
            lat = lats[i] if i < len(lats) else resp["latitude"]
            lon = lons[i] if i < len(lons) else resp["longitude"]
            times = resp["hourly"]["time"]
            precip = resp["hourly"]["precipitation"]
            
            hourly_map = {t: p for t, p in zip(times, precip) if p is not None}
            
            # Form 24-hour accumulations ending at each target valid_time
            # Valid time is init_time + lead_time_hours
            init_dt = datetime.strptime(run_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            
            for lt in lead_time_hours:
                valid_dt = init_dt + timedelta(hours=lt)
                accum = 0.0
                valid = True
                
                # Sum previous 24 hours leading up to valid_time
                for h in range(24):
                    t_str = (valid_dt - timedelta(hours=23 - h)).strftime("%Y-%m-%dT%H:00")
                    if t_str in hourly_map:
                        accum += hourly_map[t_str]
                    else:
                        valid = False
                        break
                        
                if valid:
                    results.append({
                        "latitude": lat,
                        "longitude": lon,
                        "init_time": init_dt.isoformat(),
                        "valid_time": valid_dt.isoformat(),
                        "lead_time_hours": lt,
                        "precipitation_24h": accum,
                        "run_id": f"ecmwf_ifs_00Z_{run_date}"
                    })
                    
        return results
