import pytest
from unittest.mock import patch
from datetime import datetime, timedelta
from ml.benchmark_data.schema import BenchmarkObservation
from ml.benchmark_data.alignment import SpatialNormalizer, TemporalAligner
from ml.benchmark_data.ingest_era5 import ERA5HistoricalProvider
from ml.benchmark_data.ingest_ecmwf_archive import ECMWFHistoricalProvider
from ml.benchmark_data.weathernext_adapter import WeatherNextBenchmarkAdapter

def test_spatial_normalization():
    wn3_recs = [
        BenchmarkObservation(
            forecast_provider="weathernext",
            model_id="wn3", run_id="run",
            init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
            lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="grid_28_77",
            rainfall_mm_24h=10.0, reference_rainfall_mm_24h=-1.0
        )
    ]
    remapped = SpatialNormalizer.conservative_remap_01_to_025(wn3_recs, [28.0], [77.0])

def test_temporal_alignment_and_missing_data_dropped():
    wn3 = [
        BenchmarkObservation("w", "m", "r", "2026-01-01T00", "2026-01-02T00", 24, 28.0, 77.0, "g", 10.0, -1)
    ]
    ecmwf = [
        {"latitude": 28.0, "longitude": 77.0, "valid_time": "2026-01-02T00", "precipitation_24h": 12.0, "init_time": "2026-01-01T00", "run_id": "r2"}
    ]
    era5 = []
    
    aligned = TemporalAligner.align(wn3, ecmwf, era5)
    assert len(aligned) == 0, "Missing data should be dropped, not imputed!"

def test_no_marginal_quantiles_cumulative():
    rec = BenchmarkObservation("w", "m", "r", "t", "t", 24, 0, 0, "g", 10.0, -1)
    assert not hasattr(rec, "p90_mm_24h"), "No quantiles should be fabricated!"
    assert rec.rainfall_mm_24h == 10.0

@patch('requests.get')
def test_ecmwf_run_metadata_preserved_and_24h_accumulation(mock_get):
    class MockResponse:
        def __init__(self, json_data, status_code):
            self.json_data = json_data
            self.status_code = status_code
        def json(self):
            return self.json_data
        def raise_for_status(self):
            pass
            
    # Generate 24 hours of mock data
    times = [(datetime(2026,1,1,2,0) - timedelta(hours=23-i)).strftime("%Y-%m-%dT%H:00") for i in range(24)]
    precip = [1.0] * 24
    
    mock_get.return_value = MockResponse({
        "latitude": 28.0, "longitude": 77.0,
        "hourly": {
            "time": times, 
            "precipitation": precip
        }
    }, 200)
    
    provider = ECMWFHistoricalProvider()
    recs = provider.fetch([28.0], [77.0], "2026-01-01", [2.0])
    assert len(recs) == 1
    assert recs[0]["run_id"] == "ecmwf_ifs_00Z_2026-01-01", "Run metadata must be preserved"
    assert recs[0]["precipitation_24h"] == 24.0, "24-hour accumulation sum must be exact"

# Live smoke test - DO NOT SKIP
def test_live_smoke_ecmwf():
    provider = ECMWFHistoricalProvider()
    # Need 24h lead time for accumulation to work, so lead_time=24
    res = provider.fetch([28.0], [77.0], "2026-01-01", [24.0])
    assert len(res) > 0, "Live ECMWF data should return records"

# Live smoke test - DO NOT SKIP
def test_live_smoke_era5():
    provider = ERA5HistoricalProvider()
    res = provider.fetch([28.0], [77.0], "2026-01-01", "2026-01-02")
    assert len(res) > 0, "Live ERA5 data should return records"

def test_era5_is_real_source_not_fixture():
    provider = ERA5HistoricalProvider()
    assert provider.BASE_URL == "https://archive-api.open-meteo.com/v1/archive", "ERA5 must hit real API, not mock"


def test_multiple_ecmwf_vintages_at_same_valid_time_no_overwrite():
    """
    Prove that multiple ECMWF forecast vintages arriving at the same valid_time
    are not overwritten by dictionary indexing, and both are correctly aligned
    with their corresponding WeatherNext counterpart.
    """
    valid_t = "2026-01-03T00:00:00Z"

    # Vintage 1: init 01-02, lead 24h -> valid 01-03
    ec1 = {
        "latitude": 28.0, "longitude": 77.0,
        "init_time": "2026-01-02T00:00:00Z",
        "valid_time": valid_t,
        "lead_time_hours": 24.0,
        "precipitation_24h": 15.0,
        "run_id": "ec_v1"
    }
    wn1 = BenchmarkObservation(
        forecast_provider="weathernext", model_id="wn3", run_id="wn_v1",
        init_time="2026-01-02T00:00:00Z", valid_time=valid_t,
        lead_time_hours=24.0, latitude=28.0, longitude=77.0, grid_id="g1",
        rainfall_mm_24h=14.0, reference_rainfall_mm_24h=-1.0
    )

    # Vintage 2: init 01-01, lead 48h -> valid 01-03
    ec2 = {
        "latitude": 28.0, "longitude": 77.0,
        "init_time": "2026-01-01T00:00:00Z",
        "valid_time": valid_t,
        "lead_time_hours": 48.0,
        "precipitation_24h": 25.0,
        "run_id": "ec_v2"
    }
    wn2 = BenchmarkObservation(
        forecast_provider="weathernext", model_id="wn3", run_id="wn_v2",
        init_time="2026-01-01T00:00:00Z", valid_time=valid_t,
        lead_time_hours=48.0, latitude=28.0, longitude=77.0, grid_id="g1",
        rainfall_mm_24h=24.0, reference_rainfall_mm_24h=-1.0
    )

    era5 = [
        {"latitude": 28.0, "longitude": 77.0, "valid_time": valid_t, "precipitation_24h": 20.0}
    ]

    aligned = TemporalAligner.align([wn1, wn2], [ec1, ec2], era5)

    assert len(aligned) == 2, "Both distinct forecast vintages must be retained!"

    # Verify each vintage received its own correct ECMWF forecast and wasn't overwritten
    v1_recs = [r for r in aligned if r.lead_time_hours == 24.0]
    v2_recs = [r for r in aligned if r.lead_time_hours == 48.0]
    assert len(v1_recs) == 1
    assert len(v2_recs) == 1
    assert v1_recs[0].source_metadata["ecmwf_rainfall_mm_24h"] == 15.0
    assert v1_recs[0].source_metadata["ecmwf_run_id"] == "ec_v1"
    assert v2_recs[0].source_metadata["ecmwf_rainfall_mm_24h"] == 25.0
    assert v2_recs[0].source_metadata["ecmwf_run_id"] == "ec_v2"


def test_remap_strict_mass_conservation_and_incomplete_coverage_rejection():
    """
    Prove:
    1. Uniform source rainfall strictly preserves area-integrated quantity (mass conservation).
    2. Incomplete source coverage does not produce a valid remapped value (no inflation).
    """
    # Target 0.25 cell centered at (28.0, 77.0)
    # Intersects 9 cells on 0.1 grid: lats in [27.9, 28.0, 28.1], lons in [76.9, 77.0, 77.1]
    all_9_cells = []
    for s_lat in [27.9, 28.0, 28.1]:
        for s_lon in [76.9, 77.0, 77.1]:
            all_9_cells.append(BenchmarkObservation(
                forecast_provider="weathernext", model_id="wn3", run_id="r1",
                init_time="2026-01-01T00:00:00Z", valid_time="2026-01-02T00:00:00Z",
                lead_time_hours=24.0, latitude=s_lat, longitude=s_lon,
                grid_id=f"grid_{s_lat}_{s_lon}",
                rainfall_mm_24h=10.0, reference_rainfall_mm_24h=-1.0
            ))

    # Case 1: Complete 100% coverage
    remapped = SpatialNormalizer.conservative_remap_01_to_025(all_9_cells, [28.0], [77.0])
    assert len(remapped) == 1
    # Uniform 10.0 mm rainfall across all intersecting cells must yield exactly 10.0 mm
    assert abs(remapped[0].rainfall_mm_24h - 10.0) < 1e-9
    # Total volume in square-degree-mm: 10.0 * 0.0625 = 0.625
    assert abs(remapped[0].rainfall_mm_24h * 0.0625 - 0.625) < 1e-9

    # Case 2: Incomplete coverage (drop 1 cell out of 9)
    partial_8_cells = all_9_cells[:-1]
    remapped_partial = SpatialNormalizer.conservative_remap_01_to_025(partial_8_cells, [28.0], [77.0])
    assert len(remapped_partial) == 0, "Incomplete source coverage must NOT produce a valid remapped cell!"


def test_bounded_chunked_data_iteration():
    """Prove that BenchmarkDataPipeline provides chunked streaming iteration rather than requiring a global list."""
    import inspect
    from ml.benchmark_data.pipeline import BenchmarkDataPipeline

    pipeline = BenchmarkDataPipeline()

    # Mock the providers to avoid network calls
    with patch.object(pipeline.wn3_adapter, 'fetch_benchmark_data') as mock_wn, \
         patch.object(pipeline.ecmwf_provider, 'fetch') as mock_ec, \
         patch.object(pipeline.era5_provider, 'fetch') as mock_era:

        mock_wn.return_value = []
        mock_ec.return_value = []
        mock_era.return_value = []

        chunk_gen = pipeline.iter_aligned_chunks(
            lats=[28.0], lons=[77.0],
            start_date="2026-01-01",
            end_date="2026-02-28",
            lead_time_hours=[24.0],
            chunk_days=30
        )

        assert inspect.isgenerator(chunk_gen), "Pipeline must return a generator for chunked iteration!"

        chunks_received = list(chunk_gen)
        # 59 days with chunk_days=30 produces exactly 2 discrete chunks
        assert len(chunks_received) == 2

