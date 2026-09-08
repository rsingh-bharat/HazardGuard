import { ScientificContext, HazardStatesCollection } from '../contracts/scientificContext';

export interface BuildContextInput {
  // Option A: Raw ForecastSnapshot from Sayan
  forecastSnapshot?: any;
  probabilityData?: any;
  verificationData?: any;
  hazardState?: any;

  // Option B: ImpactSimulationResult from /api/impact route
  impactResult?: any;

  // Direct ScientificContext pass-through
  directContext?: Partial<ScientificContext>;

  // Optional district metadata
  districtId?: string;
  districtName?: string;
  stateId?: string;
}

/**
 * Builds and validates an authoritative ScientificContext from structured application state.
 * Throws an Error if required runtime fields are missing or invalid, ensuring fail-closed safety.
 */
export function buildScientificContext(input: BuildContextInput): ScientificContext {
  if (!input) {
    throw new Error('MISSING_RUNTIME_DATA: No application state provided to build ScientificContext.');
  }

  // 1. Direct pass-through validation
  if (input.directContext) {
    const dc = input.directContext;
    if (!dc.snapshot_id || typeof dc.forecast_rainfall_mm !== 'number' || !Number.isFinite(dc.forecast_rainfall_mm)) {
      throw new Error('INVALID_RUNTIME_DATA: Direct ScientificContext missing mandatory snapshot_id or forecast_rainfall_mm.');
    }
    return normalizeScientificContext(dc as ScientificContext);
  }

  // 2. Extract from ImpactSimulationResult (assembled by /api/impact)
  if (input.impactResult) {
    const ir = input.impactResult;
    const prov = ir.provenance || {};
    const hazard = ir.authoritative_hazard || {};

    const snapshotId = prov.authoritative_snapshot_id || hazard.snapshot_id || ir.forecast_id;
    if (!snapshotId) {
      throw new Error('MISSING_RUNTIME_DATA: Impact simulation result missing authoritative snapshot_id.');
    }

    const rainfallMm = typeof prov.authoritative_rainfall_mm === 'number'
      ? prov.authoritative_rainfall_mm
      : (typeof hazard.rainfall_mm === 'number' ? hazard.rainfall_mm : null);

    if (rainfallMm === null || !Number.isFinite(rainfallMm)) {
      throw new Error('MISSING_RUNTIME_DATA: Authoritative meteorological rainfall_mm missing in simulation result.');
    }

    const probAvailable = Boolean(prov.authoritative_probability_available ?? hazard.probability_available);
    const probValue = probAvailable && typeof prov.authoritative_probability === 'number'
      ? prov.authoritative_probability
      : (probAvailable && typeof hazard.event_probability === 'number' ? hazard.event_probability : null);

    const isCustomScenario = ir.scenario?.type === 'CUSTOM';
    const scenarioRainfall = typeof ir.scenario?.rainfall_mm === 'number' ? ir.scenario.rainfall_mm : rainfallMm;

    const unavailableModels: string[] = [];
    if (hazard.flood_risk?.risk_level === 'UNKNOWN' || hazard.flood_risk?.status === 'FLOOD_MODEL_UNAVAILABLE') {
      unavailableModels.push('FLOOD_MODEL_UNAVAILABLE');
    }
    if (hazard.road_risk?.risk_level === 'UNKNOWN' || hazard.road_risk?.status === 'DATA_UNAVAILABLE') {
      unavailableModels.push('ROAD_EXPOSURE_UNAVAILABLE');
    }
    if (hazard.infrastructure_risk?.risk_level === 'UNKNOWN' || hazard.infrastructure_risk?.status === 'DATA_UNAVAILABLE') {
      unavailableModels.push('INFRASTRUCTURE_EXPOSURE_UNAVAILABLE');
    }
    if (hazard.population_risk?.risk_level === 'UNKNOWN' || hazard.population_risk?.status === 'DATA_UNAVAILABLE') {
      unavailableModels.push('POPULATION_EXPOSURE_UNAVAILABLE');
    }

    const hazardStates: HazardStatesCollection = {
      meteorological_intensity: hazard.meteorological_intensity || {
        risk_level: rainfallMm >= 15.6 ? 'MODERATE' : 'LOW',
        status: probAvailable ? 'COMPUTED_METEOROLOGICAL_ONLY' : 'COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE'
      },
      flood_risk: hazard.flood_risk || { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
      road_risk: hazard.road_risk || { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
      infrastructure_risk: hazard.infrastructure_risk || { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
      population_risk: hazard.population_risk || { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
      overall_hazard_level: hazard.overall_hazard_level || {
        risk_level: rainfallMm >= 15.6 ? 'MODERATE' : 'LOW',
        status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS'
      }
    };

    return {
      snapshot_id: snapshotId,
      issue_time: hazard.timestamp || prov.timestamp || null,
      latitude: hazard.latitude ?? prov.latitude ?? (ir.geography?.bbox ? (ir.geography.bbox[1] + ir.geography.bbox[3]) / 2 : null),
      longitude: hazard.longitude ?? prov.longitude ?? (ir.geography?.bbox ? (ir.geography.bbox[0] + ir.geography.bbox[2]) / 2 : null),
      lead_hours: hazard.lead_hours ?? prov.lead_hours ?? 24,
      district_id: input.districtId || ir.forecast?.district_id || ir.geography?.districtId || undefined,
      district_name: input.districtName,
      state_id: input.stateId || ir.forecast?.state_id || (input.districtId ? input.districtId.split('_')[0] : (ir.forecast?.district_id ? ir.forecast.district_id.split('_')[0] : undefined)),
      forecast_rainfall_mm: rainfallMm,
      event_threshold_mm: 15.6,
      event_probability: probValue,
      probability_available: probAvailable,
      provider: prov.authoritative_provider || 'ecmwf_ifs',
      provider_model: prov.authoritative_provider_model || 'ecmwf_ifs025',
      deployed_model_id: prov.authoritative_model_id || 'hazardguard_v7_24h',
      model_type: prov.authoritative_model_type || (prov.authoritative_fallback ? 'RAW' : 'Residual'),
      model_status: prov.authoritative_model_status || 'DEPLOY_CORRECTED',
      fallback: Boolean(prov.authoritative_fallback),
      fallback_reason: prov.authoritative_fallback_reason || null,
      nwp_valid_time: prov.authoritative_valid_time || null,
      nwp_initialization_time: prov.authoritative_init_time || null,
      distribution_type: prov.distribution_type || 'SINGLE_VALUE',
      statistics_quality: prov.statistics_quality || null,
      calibration_status: prov.authoritative_calibration_status || (probAvailable ? 'UNCALIBRATED_RAW_ENSEMBLE' : 'UNAVAILABLE'),
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: prov.authoritative_verification_status === 'VERIFIED' ? 'VERIFIED' : 'NOT_VALIDATED',
      meteorological_intensity: (hazardStates.meteorological_intensity.risk_level as any) || (rainfallMm >= 15.6 ? 'MODERATE' : 'LOW'),
      meteorological_status: hazardStates.meteorological_intensity.status,
      hazard_states: hazardStates,
      unavailable_hazard_models: unavailableModels,
      historical_metrics: ir.historical_metrics || null,
      simulation: {
        simulation_id: ir.simulation_id,
        scenario_type: ir.scenario?.type || 'HIGH',
        scenario_rainfall_mm: scenarioRainfall,
        is_custom_scenario: isCustomScenario,
        peak_water_depth_m: ir.summary?.peak_water_depth_m ?? null,
        comparison: ir.comparison || undefined,
        exposure: ir.exposure ? {
          roads_km: ir.exposure.roadsKm ?? null,
          buildings_count: ir.exposure.buildingsCount ?? null,
          hospitals_at_risk: ir.exposure.hospitalsAtRisk ?? null,
          schools_at_risk: ir.exposure.schoolsAtRisk ?? null,
          power_stations_at_risk: ir.exposure.powerStationsAtRisk ?? null,
          population_exposed: ir.exposure.populationExposed ?? null,
          status: 'COMPUTED_DIGITAL_TWIN'
        } : { status: 'DATA_UNAVAILABLE' }
      },
      data_sources: [
        `NWP Provider: ${prov.authoritative_provider || 'ecmwf_ifs'}`,
        `ML Corrector: ${prov.authoritative_model_id || 'hazardguard_v7_24h'}`,
        `Physical Simulation: ${ir.simulation_id}`
      ]
    };
  }

  // 3. Extract from raw Sayan components
  if (input.forecastSnapshot) {
    const snap = input.forecastSnapshot;
    if (!snap.snapshot_id || typeof snap.rainfall_mm !== 'number' || !Number.isFinite(snap.rainfall_mm)) {
      throw new Error('MISSING_RUNTIME_DATA: ForecastSnapshot missing snapshot_id or valid rainfall_mm.');
    }

    const probAvailable = Boolean(input.probabilityData?.probability_available);
    const probValue = probAvailable && typeof input.probabilityData?.probability === 'number'
      ? input.probabilityData.probability
      : null;

    const vStatus = input.verificationData?.verification_status === 'VERIFIED' ? 'VERIFIED' : 'NOT_VALIDATED';
    const hz = input.hazardState || {};

    const metLevel = snap.rainfall_mm >= 15.6 ? (probValue !== null && probValue >= 0.5 ? 'HIGH' : 'MODERATE') : 'LOW';

    return {
      snapshot_id: snap.snapshot_id,
      issue_time: snap.timestamp || null,
      latitude: snap.latitude,
      longitude: snap.longitude,
      lead_hours: snap.lead_hours,
      district_id: input.districtId,
      district_name: input.districtName,
      state_id: input.stateId,
      forecast_rainfall_mm: snap.rainfall_mm,
      event_threshold_mm: 15.6,
      event_probability: probValue,
      probability_available: probAvailable,
      provider: snap.provider,
      provider_model: snap.provider_model,
      deployed_model_id: snap.model_id,
      model_type: snap.model_type,
      model_status: snap.model_status,
      fallback: Boolean(snap.fallback),
      fallback_reason: snap.fallback_reason || null,
      nwp_valid_time: snap.nwp_valid_time || null,
      nwp_initialization_time: snap.nwp_initialization_time || null,
      distribution_type: snap.distribution_type || 'SINGLE_VALUE',
      statistics_quality: snap.statistics_quality || null,
      calibration_status: input.probabilityData?.calibration_status || (probAvailable ? 'UNCALIBRATED_RAW_ENSEMBLE' : 'UNAVAILABLE'),
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: vStatus,
      meteorological_intensity: (hz.meteorological_intensity?.risk_level as any) || metLevel,
      meteorological_status: hz.meteorological_intensity?.status || (probAvailable ? 'COMPUTED_METEOROLOGICAL_ONLY' : 'COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE'),
      hazard_states: {
        meteorological_intensity: hz.meteorological_intensity || { risk_level: metLevel, status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: hz.flood_risk || { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: hz.road_risk || { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: hz.infrastructure_risk || { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: hz.population_risk || { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: hz.overall_hazard_level || { risk_level: metLevel, status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: [
        'FLOOD_MODEL_UNAVAILABLE',
        'ROAD_EXPOSURE_UNAVAILABLE',
        'INFRASTRUCTURE_EXPOSURE_UNAVAILABLE',
        'POPULATION_EXPOSURE_UNAVAILABLE'
      ],
      historical_metrics: input.verificationData ? {
        rmse: input.verificationData.RMSE ?? null,
        mae: input.verificationData.MAE ?? null,
        bias: input.verificationData.Bias ?? null,
        heavy_csi: input.verificationData.CSI ?? null,
        heavy_pod: input.verificationData.POD ?? null,
        heavy_far: input.verificationData.FAR ?? null,
      } : null,
      simulation: null,
      data_sources: [
        `NWP Provider: ${snap.provider}`,
        `Model ID: ${snap.model_id}`
      ]
    };
  }

  throw new Error('MISSING_RUNTIME_DATA: Incomplete application state. Cannot construct ScientificContext without authoritative forecast snapshot.');
}

function normalizeScientificContext(ctx: ScientificContext): ScientificContext {
  // Ensure strict invariants
  if (!ctx.fss_status) ctx.fss_status = 'FSS_NOT_VALIDATED';
  if (ctx.fss_status !== 'FSS_NOT_VALIDATED') {
    ctx.fss_status = 'FSS_NOT_VALIDATED';
  }
  if (!ctx.event_threshold_mm) {
    ctx.event_threshold_mm = 15.6;
  }
  if (!ctx.unavailable_hazard_models) {
    ctx.unavailable_hazard_models = [
      'FLOOD_MODEL_UNAVAILABLE',
      'ROAD_EXPOSURE_UNAVAILABLE',
      'INFRASTRUCTURE_EXPOSURE_UNAVAILABLE',
      'POPULATION_EXPOSURE_UNAVAILABLE'
    ];
  }
  if (!ctx.data_sources || ctx.data_sources.length === 0) {
    ctx.data_sources = [`Authoritative Snapshot: ${ctx.snapshot_id}`];
  }
  return ctx;
}
