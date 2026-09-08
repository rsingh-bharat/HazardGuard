import { ForecastSnapshot } from './forecast';

export interface StormAnalogue {
  name: string;
  year: number;
  similarityPct: number;
  peakRainfallMm: number;
  deaths: number;
  economicDamageCrores: number;
  keyLearnings: string;
}

export interface DistrictDetail {
  forecast: ForecastSnapshot;
  analogues: StormAnalogue[];
  demographics: {
    totalPopulation: number;
    urbanPopulation: number;
    ruralPopulation: number;
    areaKm2: number;
    drainageDensityKmPerKm2: number;
  };
}
