import districtGeoJson from '@/data/geojson/india_districts.geojson';
import { ForecastSnapshot } from '@/lib/contracts/forecast';

export function getMergedGeoJson(forecasts: ForecastSnapshot[] | null | undefined) {
  if (!forecasts || forecasts.length === 0) return districtGeoJson as any;
  
  const forecastsById = new Map(forecasts.map(f => [f.geography.districtId.toLowerCase(), f]));
  
  return {
    ...(districtGeoJson as any),
    features: (districtGeoJson as any).features.map((feature: any) => {
      const districtId = feature.properties.district_id;
      if (!districtId) return feature;
      
      const forecast = forecastsById.get(districtId.toLowerCase());
      if (forecast) {
        return {
          ...feature,
          properties: {
            ...feature.properties,
            alert_level: forecast.rainfall.alertLevel,
            alert_hex: forecast.rainfall.alertHex,
            corrected_mm: forecast.rainfall.correctedMm,
            raw_nwp_mm: forecast.rainfall.rawNwpMm,
            regime: forecast.regime.label,
            p_heavy: forecast.probability.heavyRain_64mm,
            p_very_heavy: forecast.probability.veryHeavy_115mm,
            p_extreme: forecast.probability.extremelyHeavy_204mm,
          }
        };
      }
      return feature;
    })
  };
}
