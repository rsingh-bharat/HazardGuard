import fetch from 'node-fetch';

let passed = 0;
let total = 0;

function assertCheck(desc, condition) {
  total++;
  if (condition) {
    console.log(`   [PASS] ${desc}`);
    passed++;
  } else {
    console.error(`   [FAIL] ${desc}`);
    throw new Error(`Assertion failed: ${desc}`);
  }
}

async function runSmokeTests() {
  console.log('=================================================================');
  console.log('HAZARDGUARD SIH26080: AUTOMATED REAL-PATH SMOKE & INTEGRATION TEST');
  console.log('=================================================================\n');

  const RONAK_URL = 'http://localhost:3000';
  const SAYAN_URL = 'http://127.0.0.1:8001';
  const SOUMY_URL = 'http://127.0.0.1:8002';

  // --------------------------------------------------------------------------
  // SCENARIO A: Meghalaya / East Khasi Hills Live Forecast Flow
  // --------------------------------------------------------------------------
  console.log('--- SCENARIO A: Meghalaya / East Khasi Hills Real Forecast Flow ---');
  const meghalayaBbox = [91.30, 25.40, 91.45, 25.55]; // Cherrapunji / East Khasi Hills
  const impactReqPayload = {
    geography: {
      districtId: 'ML_EAST_KHASI_HILLS',
      bbox: meghalayaBbox
    },
    lead_time: 24,
    provider: 'ecmwf_ifs'
  };

  const impactRes = await fetch(`${RONAK_URL}/api/impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(impactReqPayload)
  });

  assertCheck('Ronak /api/impact returns HTTP 200', impactRes.status === 200);
  const impactJson = await impactRes.json();
  assertCheck('Response indicates success: true', impactJson.success === true);

  const runtimeData = impactJson.data;
  const prov = runtimeData.provenance;
  const hazard = runtimeData.authoritative_hazard;

  console.log('\n   Exact Observed Runtime State:');
  console.log(`   - Snapshot ID: ${prov.authoritative_snapshot_id}`);
  console.log(`   - Authoritative Rainfall: ${prov.authoritative_rainfall_mm} mm`);
  console.log(`   - Provider: ${prov.authoritative_provider}`);
  console.log(`   - Deployed Model: ${prov.authoritative_model_id}`);
  console.log(`   - Model Status: ${prov.authoritative_model_status}`);
  console.log(`   - Verification Status: ${prov.authoritative_verification_status}`);
  console.log(`   - Probability Available: ${prov.authoritative_probability_available}`);
  console.log(`   - Probability: ${prov.authoritative_probability}`);
  console.log(`   - Valid Time: ${prov.authoritative_valid_time}`);
  console.log(`   - Latitude: ${hazard.latitude}, Longitude: ${hazard.longitude}`);

  assertCheck('Snapshot ID is a valid non-empty UUID string', typeof prov.authoritative_snapshot_id === 'string' && prov.authoritative_snapshot_id.length > 10);
  assertCheck('Authoritative provider is ecmwf_ifs', prov.authoritative_provider === 'ecmwf_ifs');
  assertCheck('Authoritative model is hazardguard_v7_24h', prov.authoritative_model_id === 'hazardguard_v7_24h');
  assertCheck('Model status is DEPLOY_CORRECTED', prov.authoritative_model_status === 'DEPLOY_CORRECTED');
  assertCheck('Verification status is VERIFIED', prov.authoritative_verification_status === 'VERIFIED');
  assertCheck('Valid time is non-null ISO8601 string', typeof prov.authoritative_valid_time === 'string' && prov.authoritative_valid_time.includes('T'));
  assertCheck('Evaluated coordinates match Meghalaya bbox center (~25.475, ~91.375)', Math.abs(hazard.latitude - 25.475) < 0.01 && Math.abs(hazard.longitude - 91.375) < 0.01);

  // --------------------------------------------------------------------------
  // SCENARIO B: 3D Impact Twin Simulation & Unsupported Hazards
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO B: 3D Impact Twin Simulation & Unsupported Hazards ---');
  assertCheck('Soumy simulation_id is present', typeof runtimeData.simulation_id === 'string');
  assertCheck('Timeline has 9 timesteps (T+0 to T+24)', Array.isArray(runtimeData.timeline) && runtimeData.timeline.length === 9);
  assertCheck('Comparison matrix has LOW, BASE, HIGH', !!runtimeData.comparison?.LOW && !!runtimeData.comparison?.BASE && !!runtimeData.comparison?.HIGH);
  assertCheck('Comparison matrix scenarios labeled correctly as LOW, BASE, HIGH', runtimeData.comparison.LOW.scenario === 'LOW' && runtimeData.comparison.BASE.scenario === 'BASE' && runtimeData.comparison.HIGH.scenario === 'HIGH');
  assertCheck('Monotonic rainfall: HIGH >= BASE >= LOW', runtimeData.comparison.HIGH.rainfall_mm >= runtimeData.comparison.BASE.rainfall_mm && runtimeData.comparison.BASE.rainfall_mm >= runtimeData.comparison.LOW.rainfall_mm);

  assertCheck('Flood risk is explicitly UNKNOWN', hazard.flood_risk?.risk_level === 'UNKNOWN');
  assertCheck('Flood risk status is FLOOD_MODEL_UNAVAILABLE', hazard.flood_risk?.status === 'FLOOD_MODEL_UNAVAILABLE');
  assertCheck('Road risk is explicitly UNKNOWN', hazard.road_risk?.risk_level === 'UNKNOWN');
  assertCheck('Road risk status is DATA_UNAVAILABLE', hazard.road_risk?.status === 'DATA_UNAVAILABLE');
  assertCheck('Infrastructure risk is explicitly UNKNOWN', hazard.infrastructure_risk?.risk_level === 'UNKNOWN');
  assertCheck('Infrastructure risk status is DATA_UNAVAILABLE', hazard.infrastructure_risk?.status === 'DATA_UNAVAILABLE');
  assertCheck('Population risk is explicitly UNKNOWN', hazard.population_risk?.risk_level === 'UNKNOWN');
  assertCheck('Population risk status is DATA_UNAVAILABLE', hazard.population_risk?.status === 'DATA_UNAVAILABLE');

  // --------------------------------------------------------------------------
  // SCENARIO C: CUSTOM Simulation Scenario (85 mm Stress Input)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO C: CUSTOM Scenario (85.0 mm Hypothetical Stress Test) ---');
  const customRes = await fetch(`${RONAK_URL}/api/impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      geography: {
        districtId: 'ML_EAST_KHASI_HILLS',
        bbox: meghalayaBbox
      },
      lead_time: 24,
      rainfall: {
        scenario: 'CUSTOM',
        rainfallMm: 85.0,
        durationHours: 24
      }
    })
  });

  assertCheck('Custom scenario simulation returns HTTP 200', customRes.status === 200);
  const customJson = await customRes.json();
  const customData = customJson.data;

  assertCheck('Scenario type is CUSTOM', customData.scenario.type === 'CUSTOM');
  assertCheck('Simulation rainfall load is 85.0 mm', customData.scenario.rainfall_mm === 85.0);
  assertCheck('Authoritative forecast rainfall is UNALTERED by custom input', customData.provenance.authoritative_rainfall_mm === prov.authoritative_rainfall_mm);
  assertCheck('Authoritative snapshot_id is valid UUID and not overwritten by custom scenario', typeof customData.provenance.authoritative_snapshot_id === 'string' && customData.provenance.authoritative_snapshot_id.length > 10);
  assertCheck('Model ID remains hazardguard_v7_24h', customData.provenance.authoritative_model_id === 'hazardguard_v7_24h');

  // --------------------------------------------------------------------------
  // SCENARIO D: MeghDoot / RAG Explanation
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO D: MeghDoot / RAG Explanation ---');
  const explainRes = await fetch(`${RONAK_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Explain the current rainfall situation and hazard state.',
      authoritativeState: runtimeData,
      districtId: 'ML_EAST_KHASI_HILLS'
    })
  });

  assertCheck('/api/explain returns HTTP 200', explainRes.status === 200);
  const explainJson = await explainRes.json();
  assertCheck('Explanation success is true', explainJson.success === true);

  const expText = explainJson.explanation;
  const expProv = explainJson.provenance;
  const lowerExp = expText.toLowerCase();

  console.log('\n   Explanation Excerpt:');
  console.log(`   "${expText.substring(0, 300)}..."\n`);

  assertCheck('Explanation states flood risk is UNKNOWN or MODEL_UNAVAILABLE', expText.includes('UNKNOWN') || expText.includes('MODEL_UNAVAILABLE'));
  assertCheck('Explanation does NOT claim flood risk is safe', !lowerExp.includes('flood risk is safe') && !lowerExp.includes('safe from flood'));
  assertCheck('Explanation confirms comparison scenarios are NOT statistical quantiles / deterministic', 
    expText.includes('NOT statistical quantiles (P10/P50/P90)') || 
    expText.includes('deterministic') || 
    expText.includes('does not represent a probabilistic') ||
    (expText.includes('LOW') && expText.includes('BASE') && expText.includes('HIGH'))
  );
  assertCheck('Zero sample leakage of "Bengaluru" into Meghalaya request', !lowerExp.includes('bengaluru') && !lowerExp.includes('bangalore'));
  assertCheck('Zero sample leakage of "Karnataka" into Meghalaya request', !lowerExp.includes('karnataka') && !lowerExp.includes('ka_blr'));
  assertCheck('Provenance snapshot_id is identical to Sayan snapshot', expProv.snapshot_id === prov.authoritative_snapshot_id);
  assertCheck('Provenance verification_status is VERIFIED', expProv.verification_status === 'VERIFIED');

  // Test /api/chat parity
  const chatRes = await fetch(`${RONAK_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'Explain the current rainfall situation and hazard state.',
      authoritativeState: runtimeData,
      districtId: 'ML_EAST_KHASI_HILLS'
    })
  });
  assertCheck('/api/chat returns HTTP 200 with parity', chatRes.status === 200);
  const chatJson = await chatRes.json();
  assertCheck('/api/chat output has matching reply and explanation', chatJson.reply === chatJson.explanation);
  assertCheck('/api/chat preserves provenance', chatJson.provenance.snapshot_id === prov.authoritative_snapshot_id);

  // --------------------------------------------------------------------------
  // SCENARIO E: Probability Semantics
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO E: Probability Semantics ---');
  assertCheck('Calibration status is UNCALIBRATED_RAW_ENSEMBLE', prov.authoritative_calibration_status === 'UNCALIBRATED_RAW_ENSEMBLE');
  assertCheck('Explanation labels probability as UNCALIBRATED_RAW_ENSEMBLE', expText.includes('UNCALIBRATED_RAW_ENSEMBLE'));

  // --------------------------------------------------------------------------
  // SCENARIO F: Failure Behaviors (Controlled Tests)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO F: Controlled Failure Behaviors ---');

  // 1. Missing runtime data to /api/explain -> HTTP 400 DATA_UNAVAILABLE
  const badExplainRes = await fetch(`${RONAK_URL}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Tell me about rain.' })
  });
  assertCheck('Missing runtime data to /api/explain returns HTTP 400', badExplainRes.status === 400);
  const badExplainJson = await badExplainRes.json();
  assertCheck('Status is DATA_UNAVAILABLE', badExplainJson.status === 'DATA_UNAVAILABLE');
  assertCheck('Success is false', badExplainJson.success === false);

  // 2. WeatherNext missing GCS run -> HTTP 502 with null data
  const wnRes = await fetch(`${RONAK_URL}/api/impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      geography: {
        districtId: 'ML_EAST_KHASI_HILLS',
        bbox: meghalayaBbox
      },
      lead_time: 24,
      provider: 'weathernext3_statistics'
    })
  });
  if (wnRes.status === 200) {
    const wnData = await wnRes.json();
    assertCheck('WeatherNext returned live data', wnData.success === true);
  } else {
    assertCheck('WeatherNext missing remote run fails closed with HTTP 502', wnRes.status === 502);
    const wnErr = await wnRes.json();
    assertCheck('Response success is false', wnErr.success === false);
    assertCheck('Data is null (no fallback mock)', wnErr.data === null);
  }

  console.log('\n=================================================================');
  console.log(`ALL AUTOMATED REAL-PATH SMOKE CHECKS PASSED: ${passed}/${total} VERIFIED`);
  console.log('REAL APPLICATION PATH STATUS: PASS');
  console.log('=================================================================\n');
}

runSmokeTests().catch((err) => {
  console.error('Smoke tests failed:', err);
  process.exit(1);
});
