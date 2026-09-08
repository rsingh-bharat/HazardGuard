// ============================================================
// HazardGuard — Merged Impact Contract
// Owner: Ronak (request envelope) + Soumy (simulation output)
// Do NOT fabricate scientific values in this file.
// ============================================================

// ---- Shared enums (canonical — Soumy's values take precedence) ----
export type ScenarioType = 'LOW' | 'BASE' | 'HIGH' | 'CUSTOM' | 'P10' | 'P50' | 'P90';
export type SeverityLevel = 'NORMAL' | 'WATCH' | 'HIGH' | 'CRITICAL';

// ---- Ronak: request envelope sent to /api/impact ----
export interface ImpactRequest {
  forecastId: string;
  geography: {
    districtId: string;
    bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  };
  rainfall: {
    scenario: ScenarioType;
    rainfallMm: number;
    durationHours: number;
  };
  provider?: string;
}

// ---- Soumy: full simulation output tree ----

export interface RoadEvaluation {
  road_id: string;
  name: string;
  road_type: string;
  importance: string;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  water_depth_m: number;
  mean_depth_m: number;
  inundated_fraction: number;
  capacity_reduction_factor: number;
  effective_capacity_ratio: number;
  speed_reduction_pct: number;
  status: string;
  severity: SeverityLevel;
}

export interface FacilityEvaluation {
  facility_id: string;
  name: string;
  type: string;
  coordinates: [number, number];
  direct_depth_m?: number;
  access_route_depth_m?: number;
  access_risk_level?: SeverityLevel;
  severity?: SeverityLevel;
  status?: string;
}

export interface ImpactWarning {
  id: string;
  type: string;
  severity: SeverityLevel;
  title: string;
  message: string;
  timestamp: string;
  location?: {
    name?: string;
    coordinates?: [number, number];
    centroid?: [number, number];
    [key: string]: any;
  };
  trigger?: {
    parameter?: string;
    current_value?: number;
    threshold?: number;
    unit?: string;
    [key: string]: any;
  };
  scenario?: string;
  status?: string;
}

export interface ImpactTimelineState {
  timestamp: string;
  hours: number;
  rainfall_accum_mm: number;
  rainfall_increment_mm: number;
  runoff_depth_mm: number;
  water: {
    timestamp: string;
    hours: number;
    rainfall_accum_mm: number;
    rainfall_increment_mm: number;
    runoff_mm: number;
    max_depth_m: number;
    mean_depth_m: number;
    inundated_area_km2: number;
    total_water_volume_m3: number;
    depth_grid_sample: number[][];
  };
  drainage: {
    utilizations: Record<string, number>;
    surcharges: Record<string, any>;
    overflow_zones: any[];
    max_utilization: number;
    stressed_zones_count: number;
  };
  roads: {
    road_evaluations: RoadEvaluation[];
    bottlenecks: any[];
    affected_roads_count: number;
  };
  congestion: {
    congestion_score: number;
    severity: SeverityLevel;
    description: string;
  };
  exposure: {
    hospitals: FacilityEvaluation[];
    schools: any[];
    power: any[];
    buildings: any;
    population: any;
  };
  warnings: ImpactWarning[];
}

export interface SimulationSummary {
  scenario: string;
  rainfall_total_mm: number;
  peak_water_depth_m: number;
  peak_inundated_area_km2: number;
  max_congestion_score: number;
  drainage_overflow_zones_count: number;
  road_bottlenecks_count: number;
  critical_facilities_at_risk_count: number;
  estimated_population_exposed: number;
  total_warnings_count: number;
  critical_warnings_count: number;
  high_warnings_count: number;
  overall_status: string;
}

export interface ProvenanceInfo {
  forecast_id: string;
  simulation_id: string;
  scenario_type: string;
  engine_version: string;
  timestamp: string;
  terrain_version: string;
  impact_model_version: string;
  threshold_version: string;
  infrastructure_data_version: string;
  cache_hit: boolean;
  authoritative_snapshot_id?: string | null;
  authoritative_model_id?: string | null;
  authoritative_fallback?: boolean | null;
  authoritative_provider?: string | null;
  authoritative_rainfall_mm?: number | null;
  authoritative_valid_time?: string | null;
  authoritative_init_time?: string | null;
  authoritative_model_status?: string | null;
  authoritative_verification_status?: string | null;
  authoritative_probability?: number | null;
  authoritative_probability_available?: boolean | null;
  authoritative_calibration_status?: string | null;
  is_client_mock?: boolean;
}

export interface AuthoritativeHazardState {
  snapshot_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  lead_hours: number;
  rainfall_mm: number;
  event_probability: number | null;
  probability_available: boolean;
  event_threshold_mm: number;
  model_id: string;
  model_status: string;
  fallback: boolean;
  fallback_reason?: string | null;
  verification_status: 'VERIFIED' | 'NOT_VALIDATED';
  meteorological_intensity: {
    risk_level: string;
    status: string;
  };
  flood_risk: {
    risk_level: string;
    status: string;
  };
  road_risk: {
    risk_level: string;
    status: string;
  };
  infrastructure_risk: {
    risk_level: string;
    status: string;
  };
  population_risk: {
    risk_level: string;
    status: string;
  };
  overall_hazard_level: {
    risk_level: string;
    status: string;
  };
}

export interface ImpactSimulationResult {
  simulation_id: string;
  forecast_id: string;
  scenario: {
    type: ScenarioType;
    rainfall_mm: number;
    duration_hours: number;
    timestep_hours: number;
  };
  summary: SimulationSummary;
  timeline: ImpactTimelineState[];
  comparison?: Record<string, any>;
  artifacts?: {
    water_geojson?: any;
    roads_geojson?: any;
    drainage_geojson?: any;
    facilities_geojson?: any;
    warnings_geojson?: any;
    flow_vectors_geojson?: any;
    elevation_bounds?: { min_m: number; max_m: number };
  };
  provenance: ProvenanceInfo;
  authoritative_hazard?: AuthoritativeHazardState;
}

// ---- Ronak: legacy simple result (kept for /api/impact fallback response only) ----
export interface ImpactExposure {
  roadsKm: number;
  buildingsCount: number;
  hospitalsAtRisk: number;
  schoolsAtRisk: number;
  powerStationsAtRisk: number;
  populationExposed: number;
}

// ---- Soumy: 3D scene and city configuration types ----

export type CityId = "bengaluru" | "mumbai" | "delhi";

export interface CityCameraPreset {
  id: string;
  label: string;
  description: string;
  isStreetView?: boolean;
  position: [number, number, number];
  lookAt: [number, number, number];
}

export interface CityLandmark {
  id: string;
  name: string;
  type: "monument" | "skyscraper" | "bridge" | "complex" | "interchange";
  worldPos: [number, number];
  height: number;
  width?: number;
  depth?: number;
  color?: number;
  details?: string;
}

export interface CityProfile {
  id: CityId;
  name: string;
  tagline: string;
  state: string;
  districtId: string;
  bbox: [number, number, number, number];
  elevationRange: [number, number];
  valleyDepressionCenter: [number, number];
  cameraPresets: CityCameraPreset[];
  landmarks: CityLandmark[];
}

export interface SceneLayersConfig {
  terrain: boolean;
  terrainWireframe: boolean;
  water: boolean;
  rain: boolean;
  basemapStyle: "satellite" | "topo" | "dark";
  flowVectors: boolean;
  roads: boolean;
  drainage: boolean;
  facilities: boolean;
  buildings: boolean;
  streetBuildings: boolean;
  blockages: boolean;
  overflows: boolean;
  verticalScale: number;
}

/** @deprecated Use ImpactSimulationResult for the 3D Twin. This is only used by the old /api/impact mock. */
export interface ImpactResult {
  simulationId: string;
  forecastId: string;
  districtId: string;
  rainfallMm: number;
  water: {
    riskGeoJsonUrl?: string;
    flowGeoJsonUrl?: string;
    accumulationRasterUrl?: string;
  };
  exposure: ImpactExposure;
  severity: { overall: SeverityLevel };
  provenance: {
    terrainVersion: string;
    simulationVersion: string;
  };
}
