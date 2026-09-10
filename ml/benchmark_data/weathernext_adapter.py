from typing import List, Dict, Tuple
from ml.data.schema import CanonicalForecastRecord
from ml.data.providers.factory import get_provider
from ml.benchmark_data.schema import BenchmarkObservation

class WeatherNextBenchmarkAdapter:
    def __init__(self, cache_dir: str = None):
        self.provider = get_provider("weathernext3_statistics")
        self.provider.STAT_VARIABLES = ("total_precipitation_1hr_mean",)
        if cache_dir:
            self.provider.cache_dir = cache_dir

    def fetch_benchmark_data(
        self, lats: List[float], lons: List[float], start_date: str, end_date: str, lead_time_hours: List[float]
    ) -> List[BenchmarkObservation]:
        
        # WeatherNext3 expects specific run_id or default logic inside. 
        # But wait, it fetches based on start_date and end_date?
        # Actually, the original provider only takes ONE start_date.
        # Let's iterate over dates.
        
        from datetime import datetime, timedelta
        
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        obs_list = []
        curr = start
        while curr <= end:
            date_str = curr.strftime("%Y-%m-%d")
            # WeatherNext3StatisticsProvider defaults to 00hr run if run_id is omitted.
            try:
                records = self.provider.fetch_forecasts(
                    lats=lats, lons=lons, start_date=date_str, end_date=date_str, lead_time_hours=lead_time_hours
                )
            except Exception as e:
                print(f"WeatherNext fetch failed for {date_str}: {e}")
                curr += timedelta(days=1)
                continue
                
            for rec in records:
                obs_list.append(
                    BenchmarkObservation(
                        forecast_provider="weathernext3_statistics",
                        model_id=rec.provenance.model_id if rec.provenance else "weathernext_3_0_0_statistics",
                        run_id=rec.provenance.run_id if rec.provenance else f"{date_str.replace('-','')}_00hr_01_preds",
                        init_time=rec.initialization_time,
                        valid_time=rec.valid_time,
                        lead_time_hours=rec.lead_time_hours,
                        latitude=rec.latitude,
                        longitude=rec.longitude,
                        grid_id=rec.grid_id,
                        rainfall_mm_24h=rec.forecast_rainfall_mm, # Native accumulation returned by provider
                        reference_rainfall_mm_24h=-1.0, # Placeholder
                        source_metadata={"statistics_quality": rec.distribution.statistics_quality if rec.distribution else None},
                        regridding_method="native_0.1",
                        accumulation_method="24h_sum_00Z_to_00Z"
                    )
                )
            curr += timedelta(days=1)
            
        return obs_list
