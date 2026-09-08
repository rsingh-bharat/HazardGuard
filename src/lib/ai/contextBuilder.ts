import { ScientificContext } from '../contracts/scientificContext';
import { RetrievedDocument } from './knowledgeRetriever';

/**
 * Builds the structured, two-section prompt context for LLM explanation generation.
 * Enforces absolute separation between authoritative runtime ground truth and
 * retrieved explanatory knowledge.
 */
export function buildExplanationContext(
  context: ScientificContext,
  retrievedDocs: RetrievedDocument[] = []
): string {
  const parts: string[] = [];

  // =========================================================================
  // SECTION 1: AUTHORITATIVE RUNTIME STATE (IMMUTABLE GROUND TRUTH)
  // =========================================================================
  parts.push(
    `===================================================================`,
    `SECTION 1: AUTHORITATIVE STRUCTURED RUNTIME DATA (SUPREME GROUND TRUTH)`,
    `===================================================================`,
    `[PROVENANCE & ANCHORING]`,
    `- Snapshot ID: ${context.snapshot_id}`,
    `- Issue Time (UTC): ${context.issue_time}`,
    `- NWP Valid Time (UTC): ${context.nwp_valid_time || 'UNAVAILABLE'}`,
    `- NWP Initialization Time: ${context.nwp_initialization_time || 'NOT_EXPOSED_BY_PROVIDER (null)'}`,
    `- Coordinates: Lat ${context.latitude?.toFixed(4) ?? 'N/A'}, Lon ${context.longitude?.toFixed(4) ?? 'N/A'}`,
    `- Target Geography: District ${context.district_name || context.district_id || 'UNKNOWN'}, State ${context.state_id || 'UNKNOWN'}`,
    `- Lead Time: +${context.lead_hours} Hours`,
    ``,
    `[NUMERICAL METEOROLOGICAL FORECAST]`,
    `- Authoritative Forecast Rainfall: ${context.forecast_rainfall_mm.toFixed(2)} mm`,
    `- Event Threshold: ${context.event_threshold_mm.toFixed(1)} mm (IMD Moderate Rain Threshold)`,
    `- Probability Available: ${context.probability_available}`,
    `- Event Exceedance Probability (>= 15.6 mm): ${
      context.probability_available && context.event_probability !== null
        ? (context.event_probability * 100).toFixed(1) + '%'
        : 'UNAVAILABLE'
    }`,
    `- Probability Calibration Status: ${context.calibration_status}`,
    ``,
    `[MODEL LINEAGE & DEPLOYMENT]`,
    `- Provider Source: ${context.provider}`,
    `- Provider Model: ${context.provider_model}`,
    `- Deployed Model ID: ${context.deployed_model_id}`,
    `- Architecture Type: ${context.model_type}`,
    `- Deployment Status: ${context.model_status}`,
    `- Safety Gate Fallback Active: ${context.fallback}`,
    `- Fallback Reason: ${context.fallback_reason || 'None (Model Operating Nominally)'}`,
    `- Distribution Type: ${context.distribution_type || 'SINGLE_VALUE'}`,
    context.statistics_quality ? `- Statistics Quality: ${context.statistics_quality}` : '',
    ``,
    `[VERIFICATION & SKILL BENCHMARKS]`,
    `- Verification Status: ${context.verification_status}`,
    `- Fractions Skill Score (FSS): ${context.fss_status} (null)`,
  );

  if (context.historical_metrics) {
    const m = context.historical_metrics;
    parts.push(
      `- Historical Test-Set Benchmarks: RMSE=${m.rmse ?? 'N/A'} mm, MAE=${m.mae ?? 'N/A'} mm, Bias=${m.bias ?? 'N/A'} mm, Heavy CSI=${m.heavy_csi ?? 'N/A'}, Heavy POD=${m.heavy_pod ?? 'N/A'}, Heavy FAR=${m.heavy_far ?? 'N/A'}`
    );
  } else {
    parts.push(`- Historical Test-Set Benchmarks: Offline metrics not queried for this snapshot.`);
  }

  parts.push(
    ``,
    `[DECOUPLED HAZARD DIMENSIONS]`,
    `- Meteorological Intensity: ${context.meteorological_intensity} (Status: ${context.meteorological_status})`,
    `- Flood Consequence Risk: ${context.hazard_states.flood_risk.risk_level} (Status: ${context.hazard_states.flood_risk.status})`,
    `- Road Network Risk: ${context.hazard_states.road_risk.risk_level} (Status: ${context.hazard_states.road_risk.status})`,
    `- Critical Infrastructure Risk: ${context.hazard_states.infrastructure_risk.risk_level} (Status: ${context.hazard_states.infrastructure_risk.status})`,
    `- Population Exposure Risk: ${context.hazard_states.population_risk.risk_level} (Status: ${context.hazard_states.population_risk.status})`,
    `- Overall Synthesized Level: ${context.hazard_states.overall_hazard_level.risk_level} (Status: ${context.hazard_states.overall_hazard_level.status})`,
    `- Disconnected Consequence Models: ${context.unavailable_hazard_models.join(', ') || 'None'}`
  );

  if (context.simulation) {
    const sim = context.simulation;
    parts.push(
      ``,
      `[PHYSICAL 3D DIGITAL TWIN SIMULATION (SOUMY)]`,
      `- Simulation ID: ${sim.simulation_id}`,
      `- Scenario Type: ${sim.scenario_type}`,
      `- Is Custom Scenario: ${sim.is_custom_scenario}`,
      `- Scenario Rainfall Load: ${sim.scenario_rainfall_mm.toFixed(2)} mm`,
      sim.is_custom_scenario
        ? `  * NOTICE: This rainfall load is a caller-requested HYPOTHETICAL simulation input. It is NOT the forecast rainfall.`
        : `  * NOTICE: This rainfall load is anchored directly to the authoritative meteorological forecast.`,
      `- Peak Inundation Water Depth: ${
        sim.peak_water_depth_m !== null && sim.peak_water_depth_m !== undefined
          ? sim.peak_water_depth_m.toFixed(3) + ' m'
          : 'UNAVAILABLE'
      }`
    );

    if (sim.comparison) {
      parts.push(
        `- Deterministic Comparison Scenarios (Hydraulic Stress Variations - NOT P10/P50/P90):`
      );
      for (const [sKey, sVal] of Object.entries(sim.comparison)) {
        parts.push(
          `  * Scenario [${sKey}]: Rainfall=${sVal.rainfall_mm.toFixed(1)} mm, Peak Depth=${
            sVal.peak_water_depth_m !== undefined ? sVal.peak_water_depth_m.toFixed(3) + ' m' : 'N/A'
          }`
        );
      }
    }

    if (sim.exposure) {
      parts.push(
        `- Physical Exposure Assessment: Status=${sim.exposure.status}`,
        `  * Road Inundation: ${sim.exposure.roads_km !== null ? sim.exposure.roads_km + ' km' : 'DATA_UNAVAILABLE'}`,
        `  * Inundated Buildings: ${sim.exposure.buildings_count !== null ? sim.exposure.buildings_count : 'DATA_UNAVAILABLE'}`,
        `  * Hospitals At Risk: ${sim.exposure.hospitals_at_risk !== null ? sim.exposure.hospitals_at_risk : 'DATA_UNAVAILABLE'}`,
        `  * Population Exposed: ${sim.exposure.population_exposed !== null ? sim.exposure.population_exposed : 'DATA_UNAVAILABLE'}`
      );
    }
  }

  // =========================================================================
  // SECTION 2: RETRIEVED OFFICIAL REFERENCE KNOWLEDGE (OBSIDIAN VAULT)
  // =========================================================================
  parts.push(
    ``,
    `===================================================================`,
    `SECTION 2: OFFICIAL REFERENCE KNOWLEDGE (OBSIDIAN VAULT EXCERPTS)`,
    `NOTE: Explanatory background only. If any value below conflicts with SECTION 1, SECTION 1 WINS.`,
    `===================================================================`
  );

  if (retrievedDocs.length === 0) {
    parts.push(`[No auxiliary Obsidian notes retrieved for this query.]`);
  } else {
    for (let i = 0; i < retrievedDocs.length; i++) {
      const doc = retrievedDocs[i];
      parts.push(
        `--- [REFERENCE ${i + 1}] ${doc.title} (${doc.source_file}) ---`,
        `Category: ${doc.category} | Matched Tags: ${doc.matched_tags.join(', ')}`,
        doc.excerpt,
        ``
      );
    }
  }

  return parts.filter(Boolean).join('\n');
}

/**
 * Legacy compatibility adapter for existing prototype code.
 */
export function buildMeghDootContext(
  forecast: any,
  impact: any = null,
  nationalOverview?: any
): string {
  // If called with legacy parameters, wrap safely without crashing
  return `--- LEGACY CONTEXT ADAPTER ---\nForecast: ${forecast?.rainfall?.correctedMm ?? 'N/A'} mm\nImpact: ${impact?.simulationId ?? 'N/A'}`;
}
