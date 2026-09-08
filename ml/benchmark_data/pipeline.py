import math
from typing import List, Iterator, Tuple
from datetime import datetime, timedelta
from ml.benchmark_data.schema import BenchmarkObservation
from ml.benchmark_data.weathernext_adapter import WeatherNextBenchmarkAdapter
from ml.benchmark_data.ingest_ecmwf_archive import ECMWFHistoricalProvider
from ml.benchmark_data.ingest_era5 import ERA5HistoricalProvider
from ml.benchmark_data.alignment import SpatialNormalizer, TemporalAligner


class BenchmarkDataPipeline:
    def __init__(self):
        self.wn3_adapter = WeatherNextBenchmarkAdapter()
        self.ecmwf_provider = ECMWFHistoricalProvider()
        self.era5_provider = ERA5HistoricalProvider()

    def _derive_wn3_coordinates(self, lats: List[float], lons: List[float]) -> Tuple[List[float], List[float]]:
        """
        Derives all 0.1 degree source grid cell coordinates that have non-zero geometric overlap
        with any target 0.25 degree cell. Returns parallel paired coordinates for provider queries.
        """
        target_pairs = list(dict.fromkeys(zip(lats, lons))) if len(lats) == len(lons) else [(lat, lon) for lat in lats for lon in lons]
        pairs = set()
        for t_lat, t_lon in target_pairs:
            min_lat = math.ceil(round((t_lat - 0.175) * 10, 6)) / 10.0
            max_lat = math.floor(round((t_lat + 0.175) * 10, 6)) / 10.0
            min_lon = math.ceil(round((t_lon - 0.175) * 10, 6)) / 10.0
            max_lon = math.floor(round((t_lon + 0.175) * 10, 6)) / 10.0
            for lat_i in range(int(round(min_lat * 10)), int(round(max_lat * 10)) + 1):
                for lon_i in range(int(round(min_lon * 10)), int(round(max_lon * 10)) + 1):
                    s_lat = round(lat_i / 10.0, 4)
                    s_lon = round(lon_i / 10.0, 4)
                    pairs.add((s_lat, s_lon))

        sorted_pairs = sorted(list(pairs))
        wn3_lats = [p[0] for p in sorted_pairs]
        wn3_lons = [p[1] for p in sorted_pairs]
        return wn3_lats, wn3_lons

    def iter_aligned_chunks(
        self,
        lats: List[float],
        lons: List[float],
        start_date: str,
        end_date: str,
        lead_time_hours: List[float],
        chunk_days: int = 30
    ) -> Iterator[List[BenchmarkObservation]]:
        """
        Streams aligned benchmark observations chunk-by-chunk over bounded temporal windows.
        Batches ERA5 queries per chunk to prevent memory bloat and API timeouts.
        """
        wn3_lats, wn3_lons = self._derive_wn3_coordinates(lats, lons)

        overall_start = datetime.strptime(start_date, "%Y-%m-%d")
        overall_end = datetime.strptime(end_date, "%Y-%m-%d")
        max_lt = max(lead_time_hours) if lead_time_hours else 24.0

        chunk_start = overall_start
        while chunk_start <= overall_end:
            chunk_end = min(chunk_start + timedelta(days=chunk_days - 1), overall_end)
            c_start_str = chunk_start.strftime("%Y-%m-%d")
            c_end_str = chunk_end.strftime("%Y-%m-%d")

            # 1. Fetch WeatherNext for this bounded chunk
            wn3_recs = self.wn3_adapter.fetch_benchmark_data(
                wn3_lats, wn3_lons, c_start_str, c_end_str, lead_time_hours
            )

            # 2. Conservative spatial remapping (strict 100% coverage requirement)
            wn3_remapped = SpatialNormalizer.conservative_remap_01_to_025(wn3_recs, lats, lons)

            # 3. Fetch ECMWF archive for this chunk
            ecmwf_recs = []
            curr = chunk_start
            while curr <= chunk_end:
                date_str = curr.strftime("%Y-%m-%d")
                try:
                    res = self.ecmwf_provider.fetch(lats, lons, date_str, lead_time_hours)
                    ecmwf_recs.extend(res)
                except Exception as e:
                    print(f"ECMWF fetch failed for {date_str}: {e}")
                curr += timedelta(days=1)

            # 4. Fetch ERA5 batched for this bounded chunk
            era5_end_dt = chunk_end + timedelta(hours=max_lt)
            era5_end_str = era5_end_dt.strftime("%Y-%m-%d")
            try:
                era5_recs = self.era5_provider.fetch(lats, lons, c_start_str, era5_end_str)
            except Exception as e:
                print(f"ERA5 fetch failed for chunk {c_start_str} to {era5_end_str}: {e}")
                era5_recs = []

            # 5. Temporal strict intersection alignment
            aligned = TemporalAligner.align(wn3_remapped, ecmwf_recs, era5_recs)

            yield aligned

            chunk_start = chunk_end + timedelta(days=1)

    def generate_aligned_dataset(
        self,
        lats: List[float],
        lons: List[float],
        start_date: str,
        end_date: str,
        lead_time_hours: List[float],
        chunk_days: int = 30
    ) -> List[BenchmarkObservation]:
        """
        Compatibility method that iterates chunks and returns a merged list.
        """
        all_aligned: List[BenchmarkObservation] = []
        for chunk in self.iter_aligned_chunks(
            lats=lats,
            lons=lons,
            start_date=start_date,
            end_date=end_date,
            lead_time_hours=lead_time_hours,
            chunk_days=chunk_days
        ):
            all_aligned.extend(chunk)
        return all_aligned

