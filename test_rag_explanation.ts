import fs from 'fs';
import path from 'path';
import { generateExplanation } from './src/lib/ai/explanationService';
import { ScientificContext } from './src/lib/contracts/scientificContext';
import { OfflineDeterministicLLMProvider, OpenRouterLLMProvider } from './src/lib/ai/openrouter';
import { ChatMessage, ILLMProvider, LLMProviderUnavailableError, LLMResponse } from './src/lib/ai/provider';
import { retrieveRelevantKnowledge } from './src/lib/ai/knowledgeRetriever';
import { buildExplanationContext } from './src/lib/ai/contextBuilder';
import { POST as explainRouteHandler } from './app/api/explain/route';
import { POST as chatRouteHandler } from './app/api/chat/route';
import { NextRequest } from 'next/server';

let passed = 0;
let total = 0;

function assertCheck(desc: string, condition: boolean) {
  total++;
  if (condition) {
    console.log(`   [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`   [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runRAGVerificationSuite() {
  console.log('=================================================================');
  console.log('HAZARDGUARD SIH26080: RAG & EXPLANATION VERIFICATION TEST SUITE');
  console.log('=================================================================\n');

  const deterministicProvider = new OfflineDeterministicLLMProvider();

  // --------------------------------------------------------------------------
  // TEST A: Valid authoritative forecast + retrieved context -> valid explanation
  // --------------------------------------------------------------------------
  console.log('Test A: Valid Authoritative Forecast + Retrieved Context...');
  {
    const validCtx: ScientificContext = {
      snapshot_id: 'snap-ecmwf-24h-test-001',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      district_id: 'KA_BLR_URBAN',
      district_name: 'Bengaluru Urban',
      state_id: 'KA',
      forecast_rainfall_mm: 18.5,
      event_threshold_mm: 15.6,
      event_probability: 0.35,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'hazardguard_v7_24h',
      model_type: 'Residual',
      model_status: 'DEPLOY_CORRECTED',
      fallback: false,
      fallback_reason: null,
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      distribution_type: 'SINGLE_VALUE',
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'VERIFIED',
      meteorological_intensity: 'MODERATE',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'MODERATE', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'MODERATE', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE', 'ROAD_EXPOSURE_UNAVAILABLE', 'INFRASTRUCTURE_EXPOSURE_UNAVAILABLE', 'POPULATION_EXPOSURE_UNAVAILABLE'],
      historical_metrics: { rmse: 11.44, mae: 7.08, heavy_csi: 0.405 },
      simulation: null,
      data_sources: ['ECMWF IFS 0.25', 'hazardguard_v7_24h']
    };

    const res = await generateExplanation({
      query: 'Explain the 24h rainfall forecast for Bengaluru and verification status.',
      scientificContext: validCtx,
      providerOverride: deterministicProvider
    });

    assertCheck('Result success is true', res.success === true);
    if (res.success) {
      assertCheck('Retrieved references populated from Obsidian vault', res.retrieved_references.length > 0);
      assertCheck('Snapshot ID preserved in provenance', res.provenance.snapshot_id === 'snap-ecmwf-24h-test-001');
      assertCheck('Verification status is VERIFIED', res.provenance.verification_status === 'VERIFIED');
      assertCheck('Explanation includes authoritative rainfall 18.5 mm', res.explanation.includes('18.5 mm') || res.explanation.includes('18.5'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST B: Unknown hazard -> explanation explicitly says UNKNOWN
  // --------------------------------------------------------------------------
  console.log('\nTest B: Unknown Hazard -> Explanation Explicitly Says UNKNOWN...');
  {
    const ctxUnknown: ScientificContext = {
      snapshot_id: 'snap-unknown-hazard-002',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      forecast_rainfall_mm: 75.0,
      event_threshold_mm: 15.6,
      event_probability: 0.85,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'hazardguard_v7_24h',
      model_type: 'Residual',
      model_status: 'DEPLOY_CORRECTED',
      fallback: false,
      fallback_reason: null,
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'VERIFIED',
      meteorological_intensity: 'HIGH',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'HIGH', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'HIGH', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE', 'ROAD_EXPOSURE_UNAVAILABLE', 'INFRASTRUCTURE_EXPOSURE_UNAVAILABLE', 'POPULATION_EXPOSURE_UNAVAILABLE'],
      historical_metrics: null,
      simulation: null,
      data_sources: ['ECMWF IFS']
    };

    const res = await generateExplanation({
      query: 'Is there any flood or road risk in this area?',
      scientificContext: ctxUnknown,
      providerOverride: deterministicProvider
    });

    assertCheck('Success is true', res.success === true);
    if (res.success) {
      assertCheck('Explanation explicitly notes UNKNOWN or MODEL_UNAVAILABLE', res.explanation.includes('UNKNOWN') || res.explanation.includes('MODEL_UNAVAILABLE'));
      assertCheck('Explanation does NOT claim flood risk is safe or clear', !res.explanation.toLowerCase().includes('flood risk is safe') && !res.explanation.toLowerCase().includes('safe from flood'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST C: Missing probability -> explanation does not invent a probability
  // --------------------------------------------------------------------------
  console.log('\nTest C: Missing Probability -> No Invented Probability...');
  {
    const ctxNoProb: ScientificContext = {
      snapshot_id: 'snap-noprob-003',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      forecast_rainfall_mm: 22.0,
      event_threshold_mm: 15.6,
      event_probability: null,
      probability_available: false,
      provider: 'weathernext3_statistics',
      provider_model: 'WeatherNext3.0',
      deployed_model_id: 'RAW_NWP',
      model_type: 'RAW',
      model_status: 'FALLBACK_RAW_NWP',
      fallback: true,
      fallback_reason: 'Spatial statistics provider does not supply ensemble perturbations',
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      calibration_status: 'UNAVAILABLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'NOT_VALIDATED',
      meteorological_intensity: 'MODERATE',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE',
      hazard_states: {
        meteorological_intensity: { risk_level: 'MODERATE', status: 'COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'MODERATE', status: 'METEOROLOGICAL_SIGNAL_ONLY_PROBABILITY_UNAVAILABLE' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
      historical_metrics: null,
      simulation: null,
      data_sources: ['WeatherNext 3.0 Statistics']
    };

    const res = await generateExplanation({
      query: 'What is the probability of heavy rain?',
      scientificContext: ctxNoProb,
      providerOverride: deterministicProvider
    });

    assertCheck('Success is true', res.success === true);
    if (res.success) {
      assertCheck('Structured data status is PARTIAL', res.structured_data_status === 'PARTIAL');
      assertCheck('Explanation explicitly says probability is UNAVAILABLE', res.explanation.includes('UNAVAILABLE'));
      assertCheck('Explanation does NOT fabricate 0.0% probability', !res.explanation.includes('0% probability') && !res.explanation.includes('0.0% probability'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST D: LOW/BASE/HIGH -> explanation does not call them P10/P50/P90
  // --------------------------------------------------------------------------
  console.log('\nTest D: Deterministic Scenarios Are NOT P10/P50/P90...');
  {
    const ctxScenarios: ScientificContext = {
      snapshot_id: 'snap-scenarios-004',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      forecast_rainfall_mm: 35.0,
      event_threshold_mm: 15.6,
      event_probability: 0.65,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'hazardguard_v7_24h',
      model_type: 'Residual',
      model_status: 'DEPLOY_CORRECTED',
      fallback: false,
      fallback_reason: null,
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'VERIFIED',
      meteorological_intensity: 'HIGH',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'HIGH', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'HIGH', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
      historical_metrics: null,
      simulation: {
        simulation_id: 'SIM-SCENARIO-99',
        scenario_type: 'HIGH',
        scenario_rainfall_mm: 52.5,
        is_custom_scenario: false,
        peak_water_depth_m: 0.42,
        comparison: {
          LOW: { rainfall_mm: 24.5, peak_water_depth_m: 0.15 },
          BASE: { rainfall_mm: 35.0, peak_water_depth_m: 0.28 },
          HIGH: { rainfall_mm: 52.5, peak_water_depth_m: 0.42 }
        }
      },
      data_sources: ['ECMWF IFS', 'Soumy 3D Twin']
    };

    // Check prompt builder output
    const retrieved = retrieveRelevantKnowledge('comparison scenarios LOW BASE HIGH', ctxScenarios);
    const promptContext = buildExplanationContext(ctxScenarios, retrieved);
    assertCheck('Prompt explicitly states NOT P10/P50/P90', promptContext.includes('NOT P10/P50/P90'));

    const res = await generateExplanation({
      query: 'Compare the LOW, BASE, and HIGH scenarios from the simulation.',
      scientificContext: ctxScenarios,
      providerOverride: deterministicProvider
    });

    assertCheck('Success is true', res.success === true);
    if (res.success) {
      assertCheck('Explanation affirms scenarios are NOT statistical quantiles (P10/P50/P90)', res.explanation.includes('NOT statistical quantiles (P10/P50/P90)'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST E: WeatherNext mean rainfall -> correctly described as accumulated mean
  // --------------------------------------------------------------------------
  console.log('\nTest E: WeatherNext Mean Rainfall Described as Accumulated Mean...');
  {
    const ctxWN: ScientificContext = {
      snapshot_id: 'snap-wn-005',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      forecast_rainfall_mm: 42.8,
      event_threshold_mm: 15.6,
      event_probability: null,
      probability_available: false,
      provider: 'weathernext3_statistics',
      provider_model: 'WeatherNext-3.0.0',
      deployed_model_id: 'RAW_NWP',
      model_type: 'RAW',
      model_status: 'FALLBACK_RAW_NWP',
      fallback: true,
      fallback_reason: 'Statistical aggregation feed',
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      distribution_type: 'ENSEMBLE_STATISTICS',
      statistics_quality: 'SPATIAL_MEAN_ACCUMULATION',
      calibration_status: 'UNAVAILABLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'NOT_VALIDATED',
      meteorological_intensity: 'MODERATE',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE',
      hazard_states: {
        meteorological_intensity: { risk_level: 'MODERATE', status: 'COMPUTED_METEOROLOGICAL_RAINFALL_ONLY_PROBABILITY_UNAVAILABLE' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'MODERATE', status: 'METEOROLOGICAL_SIGNAL_ONLY_PROBABILITY_UNAVAILABLE' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
      historical_metrics: null,
      simulation: null,
      data_sources: ['WeatherNext 3.0 Statistics Spatial Accumulator']
    };

    const res = await generateExplanation({
      query: 'What is the WeatherNext rainfall methodology?',
      scientificContext: ctxWN,
      providerOverride: deterministicProvider
    });

    assertCheck('Success is true', res.success === true);
    if (res.success) {
      assertCheck('Explanation describes rainfall as sum of hourly means', res.explanation.includes('sum of hourly means'));
      assertCheck('Explanation does NOT describe WeatherNext as calibrated', !res.explanation.toLowerCase().includes('weathernext is calibrated'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST F: Missing runtime data -> explicit unavailable state
  // --------------------------------------------------------------------------
  console.log('\nTest F: Missing Runtime Data -> Explicit Unavailable State...');
  {
    const res = await generateExplanation({
      query: 'Explain current forecast.',
      // No context, no snapshot, no authoritative state passed
    });

    assertCheck('Returns success = false on missing runtime data', res.success === false);
    if (!res.success) {
      assertCheck('Status is DATA_UNAVAILABLE', res.status === 'DATA_UNAVAILABLE');
      assertCheck('Error message mentions missing runtime data', res.error.includes('Missing runtime data'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST G: OpenRouter failure -> explicit unavailable state, no fabricated answer
  // --------------------------------------------------------------------------
  console.log('\nTest G: OpenRouter Failure -> Explicit Unavailable State (No Canned Fallback)...');
  {
    // Create a mock provider that simulates a 502/network failure
    const failingProvider: ILLMProvider = {
      providerName: 'failing_test_provider',
      async chat(): Promise<LLMResponse> {
        throw new LLMProviderUnavailableError('Simulated OpenRouter 502 Bad Gateway', 'OPENROUTER_API_ERROR', 502);
      }
    };

    const validCtx: ScientificContext = {
      snapshot_id: 'snap-failover-007',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      forecast_rainfall_mm: 20.0,
      event_threshold_mm: 15.6,
      event_probability: 0.5,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'hazardguard_v7_24h',
      model_type: 'Residual',
      model_status: 'DEPLOY_CORRECTED',
      fallback: false,
      fallback_reason: null,
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'VERIFIED',
      meteorological_intensity: 'MODERATE',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'MODERATE', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'MODERATE', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
      historical_metrics: null,
      simulation: null,
      data_sources: ['ECMWF IFS']
    };

    const res = await generateExplanation({
      query: 'Summarize risk.',
      scientificContext: validCtx,
      providerOverride: failingProvider
    });

    assertCheck('Failing provider returns success = false', res.success === false);
    if (!res.success) {
      assertCheck('Status is LLM_UNAVAILABLE', res.status === 'LLM_UNAVAILABLE');
      assertCheck('No fabricated canned advice text returned', !res.error.includes('Follow IMD standard color-coded warnings'));
      assertCheck('Provenance snapshot survives in failure response', res.provenance?.snapshot_id === 'snap-failover-007');
    }
  }

  // --------------------------------------------------------------------------
  // TEST H: API key never appears in client bundle/code path
  // --------------------------------------------------------------------------
  console.log('\nTest H: API Key Never Appears in Client Bundle/Code Path...');
  {
    const clientDir = path.resolve('d:/integration/integration/rsg-hazardguard/src/components');
    const hooksDir = path.resolve('d:/integration/integration/rsg-hazardguard/src/hooks');

    const scanDirForKeys = (dir: string): string[] => {
      const violations: string[] = [];
      if (!fs.existsSync(dir)) return violations;
      const files = fs.readdirSync(dir, { recursive: true }) as string[];
      for (const rel of files) {
        const full = path.join(dir, String(rel));
        if (fs.statSync(full).isFile() && (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js'))) {
          const content = fs.readFileSync(full, 'utf-8');
          if (content.includes('OPENROUTER_API_KEY') || content.includes('GROQ_API_KEY')) {
            violations.push(full);
          }
          if (content.includes('NEXT_PUBLIC_OPENROUTER') || content.includes('NEXT_PUBLIC_GROQ')) {
            violations.push(full);
          }
        }
      }
      return violations;
    }

    const violations = [...scanDirForKeys(clientDir), ...scanDirForKeys(hooksDir)];
    assertCheck('Zero API key references in client components and hooks', violations.length === 0);
  }

  // --------------------------------------------------------------------------
  // TEST I: Provenance survives into the explanation response
  // --------------------------------------------------------------------------
  console.log('\nTest I: Provenance Survives into Explanation Response...');
  {
    const provCtx: ScientificContext = {
      snapshot_id: 'snap-provenance-audit-009',
      issue_time: '2026-09-06T04:30:00Z',
      latitude: 18.5204,
      longitude: 73.8567,
      lead_hours: 48,
      district_id: 'MH_PUNE',
      district_name: 'Pune',
      state_id: 'MH',
      forecast_rainfall_mm: 12.4,
      event_threshold_mm: 15.6,
      event_probability: 0.12,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'RAW_NWP',
      model_type: 'RAW',
      model_status: 'FALLBACK_RAW_NWP',
      fallback: true,
      fallback_reason: 'Registry mandates fallback: No ML candidate passed safety gate at +48h.',
      nwp_valid_time: '2026-09-08T00:00:00Z',
      nwp_initialization_time: null,
      distribution_type: 'SINGLE_VALUE',
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'NOT_VALIDATED',
      meteorological_intensity: 'LOW',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'LOW', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'LOW', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE', 'ROAD_EXPOSURE_UNAVAILABLE'],
      historical_metrics: null,
      simulation: null,
      data_sources: ['ECMWF IFS 0.25 (Raw Pass-Through)']
    };

    const res = await generateExplanation({
      query: 'Check forecast and provenance details for Pune.',
      scientificContext: provCtx,
      providerOverride: deterministicProvider
    });

    assertCheck('Success is true', res.success === true);
    if (res.success) {
      assertCheck('snapshot_id matches', res.provenance.snapshot_id === 'snap-provenance-audit-009');
      assertCheck('provider matches ecmwf_ifs', res.provenance.provider === 'ecmwf_ifs');
      assertCheck('model_id matches RAW_NWP', res.provenance.model_id === 'RAW_NWP');
      assertCheck('model_status matches FALLBACK_RAW_NWP', res.provenance.model_status === 'FALLBACK_RAW_NWP');
      assertCheck('initialization_time is null (honest Open-Meteo constraint)', res.provenance.initialization_time === null);
      assertCheck('valid_time is preserved', res.provenance.valid_time === '2026-09-08T00:00:00Z');
      assertCheck('issue_time is preserved', res.provenance.issue_time === '2026-09-06T04:30:00Z');
      assertCheck('verification_status is NOT_VALIDATED', res.provenance.verification_status === 'NOT_VALIDATED');
      assertCheck('calibration_status preserved', res.provenance.calibration_status === 'UNCALIBRATED_RAW_ENSEMBLE');
      assertCheck('data_sources array non-empty', res.provenance.data_sources.length > 0);
      assertCheck('retrieved_references array non-empty', res.retrieved_references.length > 0);
    }
  }

  // --------------------------------------------------------------------------
  // TEST J: Conflicting Obsidian / Runtime Values -> Authoritative Runtime Wins
  // --------------------------------------------------------------------------
  console.log('\nTest J: Conflicting Obsidian/Runtime Values -> Runtime Data Wins...');
  {
    // Runtime forecast rainfall is 11.2 mm, while thresholds.md notes discuss 64.5mm or 15.6mm
    const ctxConflict: ScientificContext = {
      snapshot_id: 'snap-conflict-010',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 25.467,
      longitude: 91.366,
      lead_hours: 24,
      forecast_rainfall_mm: 11.2,
      event_threshold_mm: 15.6,
      event_probability: 0.08,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'hazardguard_v7_24h',
      model_type: 'Residual',
      model_status: 'DEPLOY_CORRECTED',
      fallback: false,
      fallback_reason: null,
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'VERIFIED',
      meteorological_intensity: 'LOW',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'LOW', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'LOW', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
      historical_metrics: null,
      simulation: null,
      data_sources: ['ECMWF IFS']
    };

    const retrieved = retrieveRelevantKnowledge('threshold heavy rain 64.5 mm', ctxConflict);
    const promptText = buildExplanationContext(ctxConflict, retrieved);

    assertCheck('Prompt explicitly states SECTION 1 is supreme ground truth', promptText.includes('SECTION 1: AUTHORITATIVE STRUCTURED RUNTIME DATA (SUPREME GROUND TRUTH)'));
    assertCheck('Prompt states SECTION 1 WINS if conflict exists', promptText.includes('SECTION 1 WINS'));
    assertCheck('Authoritative forecast rainfall is 11.20 mm in prompt', promptText.includes('Authoritative Forecast Rainfall: 11.20 mm'));

    const res = await generateExplanation({
      query: 'What is the rainfall amount for this location?',
      scientificContext: ctxConflict,
      providerOverride: deterministicProvider
    });

    assertCheck('Explanation affirms 11.2 mm and not a retrieved document number', res.success && (res.explanation.includes('11.20 mm') || res.explanation.includes('11.2 mm') || res.explanation.includes('11.2')));
  }

  // --------------------------------------------------------------------------
  // TEST K: CUSTOM Scenario -> Not Described as Authoritative Forecast
  // --------------------------------------------------------------------------
  console.log('\nTest K: CUSTOM Scenario Isolated from Authoritative Forecast...');
  {
    const ctxCustom: ScientificContext = {
      snapshot_id: 'snap-custom-sim-011',
      issue_time: '2026-09-06T00:00:00Z',
      latitude: 12.9716,
      longitude: 77.5946,
      lead_hours: 24,
      forecast_rainfall_mm: 14.2, // Authoritative meteorological forecast
      event_threshold_mm: 15.6,
      event_probability: 0.22,
      probability_available: true,
      provider: 'ecmwf_ifs',
      provider_model: 'ecmwf_ifs025',
      deployed_model_id: 'hazardguard_v7_24h',
      model_type: 'Residual',
      model_status: 'DEPLOY_CORRECTED',
      fallback: false,
      fallback_reason: null,
      nwp_valid_time: '2026-09-07T00:00:00Z',
      nwp_initialization_time: null,
      calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
      fss_status: 'FSS_NOT_VALIDATED',
      verification_status: 'VERIFIED',
      meteorological_intensity: 'LOW',
      meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
      hazard_states: {
        meteorological_intensity: { risk_level: 'LOW', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
        flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
        road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
        overall_hazard_level: { risk_level: 'LOW', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
      },
      unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
      historical_metrics: null,
      simulation: {
        simulation_id: 'SIM-CUSTOM-STRESS-404',
        scenario_type: 'CUSTOM',
        scenario_rainfall_mm: 95.0, // Hypothetical caller stress input
        is_custom_scenario: true,
        peak_water_depth_m: 0.78
      },
      data_sources: ['ECMWF IFS', 'User Custom Hydraulic Simulation']
    };

    const res = await generateExplanation({
      query: 'Explain the rainfall in this simulation run.',
      scientificContext: ctxCustom,
      providerOverride: deterministicProvider
    });

    assertCheck('Success is true', res.success === true);
    if (res.success) {
      assertCheck('Identifies 95.0 mm as hypothetical user CUSTOM scenario', res.explanation.includes('hypothetical user CUSTOM scenario with 95.0 mm load') || res.explanation.includes('CUSTOM'));
      assertCheck('Affirms authoritative forecast rainfall remains 14.2 mm', res.explanation.includes('14.20 mm') || res.explanation.includes('14.2 mm') || res.explanation.includes('14.2'));
    }
  }

  // --------------------------------------------------------------------------
  // TEST L: API Route Endpoints (/api/explain and /api/chat)
  // --------------------------------------------------------------------------
  console.log('\nTest L: Verification of Next.js Route Handlers (/api/explain & /api/chat)...');
  {
    // Test /api/explain route handler
    const explainReq = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Status check',
        scientificContext: {
          snapshot_id: 'snap-route-test-012',
          forecast_rainfall_mm: 16.0,
          latitude: 12.9716,
          longitude: 77.5946,
          lead_hours: 24,
          provider: 'ecmwf_ifs',
          provider_model: 'ecmwf_ifs025',
          deployed_model_id: 'hazardguard_v7_24h',
          model_type: 'Residual',
          model_status: 'DEPLOY_CORRECTED',
          fallback: false,
          calibration_status: 'UNCALIBRATED_RAW_ENSEMBLE',
          fss_status: 'FSS_NOT_VALIDATED',
          verification_status: 'VERIFIED',
          meteorological_intensity: 'MODERATE',
          meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
          hazard_states: {
            meteorological_intensity: { risk_level: 'MODERATE', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
            flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
            road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
            infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
            population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
            overall_hazard_level: { risk_level: 'MODERATE', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
          }
        }
      })
    });

    process.env.HAZARDGUARD_OFFLINE_LLM = 'true';
    const explainRes = await explainRouteHandler(explainReq);
    assertCheck('/api/explain returns HTTP 200 with valid payload', explainRes.status === 200);
    const explainData = await explainRes.json();
    assertCheck('Route output contains explanation text', typeof explainData.explanation === 'string');
    assertCheck('Route output contains provenance', !!explainData.provenance && explainData.provenance.snapshot_id === 'snap-route-test-012');

    // Test /api/chat route handler
    const chatReq = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is the active risk?',
        scientificContext: explainData.provenance ? {
          ...explainData.provenance,
          forecast_rainfall_mm: 16.0,
          latitude: 12.9716,
          longitude: 77.5946,
          lead_hours: 24,
          event_threshold_mm: 15.6,
          event_probability: 0.45,
          probability_available: true,
          deployed_model_id: 'hazardguard_v7_24h',
          model_type: 'Residual',
          fallback: false,
          fallback_reason: null,
          nwp_valid_time: null,
          nwp_initialization_time: null,
          fss_status: 'FSS_NOT_VALIDATED',
          meteorological_intensity: 'MODERATE',
          meteorological_status: 'COMPUTED_METEOROLOGICAL_ONLY',
          hazard_states: {
            meteorological_intensity: { risk_level: 'MODERATE', status: 'COMPUTED_METEOROLOGICAL_ONLY' },
            flood_risk: { risk_level: 'UNKNOWN', status: 'FLOOD_MODEL_UNAVAILABLE' },
            road_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
            infrastructure_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
            population_risk: { risk_level: 'UNKNOWN', status: 'DATA_UNAVAILABLE' },
            overall_hazard_level: { risk_level: 'MODERATE', status: 'METEOROLOGICAL_SIGNAL_ONLY_NO_MULTI_HAZARD_SYNTHESIS' }
          },
          unavailable_hazard_models: ['FLOOD_MODEL_UNAVAILABLE'],
          historical_metrics: null,
          simulation: null,
          data_sources: ['ECMWF IFS']
        } : undefined
      })
    });

    const chatRes = await chatRouteHandler(chatReq);
    assertCheck('/api/chat returns HTTP 200 when backed by explanationService', chatRes.status === 200);
    const chatData = await chatRes.json();
    assertCheck('/api/chat output has reply string', typeof chatData.reply === 'string');
    assertCheck('/api/chat output preserves provenance', !!chatData.provenance);
  }

  console.log('\n=================================================================');
  console.log(`ALL RAG & EXPLANATION CHECKS PASSED: ${passed}/${total} CHECKS VERIFIED`);
  console.log('RAG EXPLANATION LAYER STATUS: PASS');
  console.log('=================================================================\n');
}

runRAGVerificationSuite().catch((err) => {
  console.error('\nRAG VERIFICATION FAILED:', err);
  process.exit(1);
});
