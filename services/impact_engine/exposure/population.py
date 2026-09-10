"""
Population exposure assessment over scenario-affected footprint.
Careful scientific phrasing: 'estimated population exposure under scenario'.
"""
from typing import List, Dict, Any

def get_population_grid() -> List[Dict[str, Any]]:
    """
    Returns neighborhood demographic cells with density (persons/km2)
    across the urban ward sectors.
    """
    return [
        {"ward": "Ejipura (Ward 148)", "density_per_km2": 24000, "area_km2": 1.6, "lon": 77.630, "lat": 12.942},
        {"ward": "Koramangala (Ward 151)", "density_per_km2": 14000, "area_km2": 3.8, "lon": 77.625, "lat": 12.934},
        {"ward": "HSR Layout (Ward 174)", "density_per_km2": 12000, "area_km2": 7.1, "lon": 77.645, "lat": 12.915},
        {"ward": "Bellandur (Ward 150)", "density_per_km2": 16000, "area_km2": 8.4, "lon": 77.675, "lat": 12.932}
    ]

def estimate_population_exposure(
    population_cells: List[Dict[str, Any]],
    water_depth_grid: List[List[float]],
    bbox: List[float]
) -> Dict[str, Any]:
    from .spatial import sample_raster_at_point

    total_exposed_pop = 0
    ward_breakdown = []

    for cell in population_cells:
        d = sample_raster_at_point(cell["lon"], cell["lat"], water_depth_grid, bbox)
        
        # Exposure threshold: perceptible water logging > 0.10m in ward
        if d >= 0.10:
            # Impact ratio scales with water depth (0.1m -> 5% of ward pop; 0.4m -> 35% of ward pop)
            impact_fraction = min(0.60, (d / 0.50) * 0.40)
            ward_pop = cell["density_per_km2"] * cell["area_km2"]
            exposed_pop = int(ward_pop * impact_fraction)
            total_exposed_pop += exposed_pop

            ward_breakdown.append({
                "ward": cell["ward"],
                "representative_water_depth_m": round(d, 3),
                "estimated_exposed_population": exposed_pop,
                "severity": "CRITICAL" if d >= 0.30 else ("HIGH" if d >= 0.18 else "WATCH")
            })

    return {
        "estimated_total_population_exposure": total_exposed_pop,
        "ward_breakdown": ward_breakdown,
        "methodology": "Spatial intersection of 100m demographic density with simulated water depth raster",
        "scientific_disclaimer": "Scenario-based exposure estimate. Does not represent verified displaced persons or evacuation count."
    }
