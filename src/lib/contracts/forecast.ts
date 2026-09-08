export type AlertLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export type RegimeLabel =
  | 'ACTIVE_MONSOON'
  | 'BREAK_MONSOON'
  | 'MONSOON_DEPRESSION'
  | 'OROGRAPHIC'
  | 'COASTAL_CONVECTION'
  | 'WESTERN_DISTURBANCE';

export interface RiverRisk {
  riverName: string;
  basin: string;
  dangerLevel: 'NORMAL' | 'WARNING' | 'DANGER' | 'SEVERE';
}

export interface ForecastSnapshot {
  forecastId: string;      // e.g. "forecast_20260901_00z"
  issuedAt: string;        // ISO-8601
  validFrom: string;
  validTo: string;
  leadHours: 0 | 6 | 12 | 24 | 48 | 72;

  geography: {
    stateId: string;
    districtId: string;
    districtName: string;
    stateName: string;
    lat: number;
    lon: number;
  };

  rainfall: {
    rawNwpMm: number | null;
    correctedMm: number;
    p10Mm: number | null;
    p50Mm: number | null;
    p90Mm: number | null;
    alertLevel: AlertLevel;
    alertHex: string;           // CSS hex colour
    correctionMethod: string;   // 'REGIME_AWARE_XGBOOST_QDM'
  };

  regime: {
    label: RegimeLabel;
    confidence: number;         // 0–1
    description: string;        // human-readable cause
  };

  probability: {
    heavyRain_64mm: number;      // P(R > 64.5 mm) — 0 to 1
    veryHeavy_115mm: number;
    extremelyHeavy_204mm: number;
  };

  riversAtRisk: RiverRisk[];

  metadata: {
    provider: string;
    modelVersion: string;
    processingVersion: string;
  };
}

// Array of forecasts for all districts — what /api/forecast returns
export type ForecastCollection = ForecastSnapshot[];
