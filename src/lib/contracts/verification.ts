export interface MetricSet {
  rmse: number;
  mae: number;
  ets: number;
  csi: number;
  pod: number;
  far: number;
  fss: number;
}

export interface VerificationResult {
  scope: {
    state?: string;
    district?: string;
    regime?: string;
    leadHours: number;
  };
  rawNwp: MetricSet;
  corrected: MetricSet;
  improvement: {
    rmseReductionPct: number;
    csiGainPct: number;
    fssGainPct: number;
  };
}
