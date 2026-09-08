/**
 * ScientificContext: Ground Truth Contract for RAG & Explanation Layer
 * 
 * Inviolable Rules:
 * 1. The LLM is an explanation/retrieval layer, NOT the source of numerical truth.
 * 2. All numerical fields, coordinates, timestamps, model identifiers, probabilities,
 *    verification metrics, rainfall, hazard states, and exposure values must originate
 *    from structured authoritative application data.
 * 3. Authoritative meteorological rainfall comes EXCLUSIVELY from ForecastSnapshot.
 * 4. Caller rainfall may exist ONLY as an explicitly labeled hypothetical CUSTOM
 *    simulation input and must NEVER overwrite ForecastSnapshot rainfall, provenance,
 *    model identity, forecast status, or verification.
 */

export interface HistoricalVerificationMetrics {
  rmse?: number | null;
  mae?: number | null;
  bias?: number | null;
  heavy_csi?: number | null;
  heavy_pod?: number | null;
  heavy_far?: number | null;
}

export interface HazardRiskDimension {
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  status: string;
}

export interface HazardStatesCollection {
  meteorological_intensity: HazardRiskDimension;
  flood_risk: HazardRiskDimension;
  road_risk: HazardRiskDimension;
  infrastructure_risk: HazardRiskDimension;
  population_risk: HazardRiskDimension;
  overall_hazard_level: HazardRiskDimension;
}

export interface PhysicalSimulationContext {
  simulation_id: string;
  scenario_type: 'LOW' | 'BASE' | 'HIGH' | 'CUSTOM' | string;
  scenario_rainfall_mm: number;
  is_custom_scenario: boolean;
  peak_water_depth_m?: number | null;
  comparison?: Record<string, { rainfall_mm: number; peak_water_depth_m?: number }>;
  exposure?: {
    roads_km?: number | null;
    buildings_count?: number | null;
    hospitals_at_risk?: number | null;
    schools_at_risk?: number | null;
    power_stations_at_risk?: number | null;
    population_exposed?: number | null;
    status: string; // e.g. 'DATA_UNAVAILABLE' or 'COMPUTED_HYDRAULIC'
  };
}

export interface ScientificContext {
  // Provenance Anchor
  snapshot_id: string;
  issue_time: string | null;
  latitude: number | null;
  longitude: number | null;
  lead_hours: number;
  district_id?: string;
  district_name?: string;
  state_id?: string;

  // Authoritative Numerical Forecast (Meteorological)
  forecast_rainfall_mm: number;
  event_threshold_mm: number; // default: 15.6 mm (IMD moderate)
  event_probability: number | null; // null if probability_available is false
  probability_available: boolean;

  // Model Lineage & Deployment
  provider: string;
  provider_model: string;
  deployed_model_id: string;
  model_type: string;
  model_status: 'DEPLOY_CORRECTED' | 'FALLBACK_RAW_NWP' | string;
  fallback: boolean;
  fallback_reason: string | null;

  // Upstream NWP Run & Timing
  nwp_valid_time: string | null;
  nwp_initialization_time: string | null;
  distribution_type?: string; // 'SINGLE_VALUE' | 'ENSEMBLE_STATISTICS'
  statistics_quality?: string | null;

  // Scientific Status & Disclaimers
  calibration_status: string; // 'UNCALIBRATED_RAW_ENSEMBLE' | 'UNAVAILABLE'
  fss_status: string; // strictly 'FSS_NOT_VALIDATED'
  verification_status: 'VERIFIED' | 'NOT_VALIDATED';

  // Decoupled Hazard States
  meteorological_intensity: 'LOW' | 'MODERATE' | 'HIGH';
  meteorological_status: string;
  hazard_states: HazardStatesCollection;
  unavailable_hazard_models: string[];

  // Historical Verification Benchmarks
  historical_metrics: HistoricalVerificationMetrics | null;

  // Physical Impact Simulation (Soumy Digital Twin)
  simulation: PhysicalSimulationContext | null;

  // Data Source Provenance
  data_sources: string[];
}
