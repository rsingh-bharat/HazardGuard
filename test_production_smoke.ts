import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { NextRequest } from 'next/server';
import { POST as impactRouteHandler } from './app/api/impact/route';
import { POST as explainRouteHandler } from './app/api/explain/route';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function runProductionSmokeCheck() {
  console.log('=================================================================');
  console.log('HAZARDGUARD SIH26080: PRODUCTION-PATH SMOKE CHECK');
  console.log('=================================================================\n');

  let sayanProc: ChildProcess | null = null;
  let soumyProc: ChildProcess | null = null;

  try {
    // 1. Start Sayan ML Service
    console.log('1. Launching Sayan ML Service on port 8001...');
    const pythonBin = 'C:\\Users\\Lenovo\\Hazard-guard\\.venv-ml\\Scripts\\python.exe';
    sayanProc = spawn(pythonBin, ['-m', 'uvicorn', 'ml.api.main:app', '--port', '8001'], {
      cwd: path.resolve('d:/integration/integration/handoff2'),
      shell: true
    });

    // 2. Start Soumy Impact Service
    console.log('2. Launching Soumy Impact Service on port 3001...');
    soumyProc = spawn('node', ['--import', 'tsx', 'server.ts'], {
      cwd: path.resolve('d:/integration/integration/3DImpactTwin'),
      env: { ...process.env, PORT: '3001' },
      shell: true
    });

    await sleep(6500);

    process.env.ML_SERVICE_URL = 'http://127.0.0.1:8001';
    process.env.IMPACT_SERVICE_URL = 'http://127.0.0.1:3001';
    process.env.HAZARDGUARD_OFFLINE_LLM = 'true';

    // 3. Trigger REAL forecast/impact flow for MEGHALAYA (Cherrapunji/East Khasi Hills)
    console.log('\n3. Triggering REAL Production Pipeline for Meghalaya (Lat 25.467, Lon 91.366)...');
    const meghalayaBbox: [number, number, number, number] = [91.30, 25.40, 91.45, 25.55];
    const impactReq = new NextRequest('http://localhost:3000/api/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geography: {
          districtId: 'ML_EAST_KHASI_HILLS',
          bbox: meghalayaBbox
        },
        lead_time: 24,
        provider: 'ecmwf_ifs'
      })
    });

    const impactRes = await impactRouteHandler(impactReq);
    assertCheck('Impact route returns HTTP 200 for Meghalaya', impactRes.status === 200);
    const impactData = await impactRes.json();
    assertCheck('Impact data success is true', impactData.success === true);

    const runtimeState = impactData.data;
    const prov = runtimeState.provenance;
    const hazard = runtimeState.authoritative_hazard;

    console.log('\n   Exact Runtime Values Observed:');
    console.log(`   - Snapshot ID: ${prov.authoritative_snapshot_id}`);
    console.log(`   - Rainfall: ${prov.authoritative_rainfall_mm} mm`);
    console.log(`   - Model ID: ${prov.authoritative_model_id}`);
    console.log(`   - Provider: ${prov.authoritative_provider}`);
    console.log(`   - Model Status: ${prov.authoritative_model_status}`);
    console.log(`   - Verification Status: ${prov.authoritative_verification_status}`);
    console.log(`   - Probability Available: ${prov.authoritative_probability_available}`);
    console.log(`   - Probability: ${prov.authoritative_probability}`);
    console.log(`   - Valid Time: ${prov.authoritative_valid_time}`);
    console.log(`   - Latitude: ${hazard.latitude}, Longitude: ${hazard.longitude}`);

    // 4. Generate REAL explanation through /api/explain using runtime state
    console.log('\n4. Generating Real Explanation via /api/explain for Meghalaya State...');
    const explainReq = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Provide an operational briefing on rainfall, hazard states, and verification.',
        authoritativeState: runtimeState,
        districtId: 'ML_EAST_KHASI_HILLS'
      })
    });

    const explainRes = await explainRouteHandler(explainReq);
    assertCheck('/api/explain returns HTTP 200', explainRes.status === 200);
    const explainResult = await explainRes.json();
    assertCheck('Explain result success is true', explainResult.success === true);

    const expProv = explainResult.provenance;
    const expText = explainResult.explanation;

    // 5. Confirm explanation matches authoritative runtime values exactly
    console.log('\n5. Verifying 1:1 Parity with Authoritative Runtime State...');
    assertCheck('Snapshot ID matches authoritative runtime snapshot', expProv.snapshot_id === prov.authoritative_snapshot_id);
    assertCheck('Provider matches authoritative provider (ecmwf_ifs)', expProv.provider === 'ecmwf_ifs');
    assertCheck('Model ID matches authoritative model (hazardguard_v7_24h)', expProv.model_id === 'hazardguard_v7_24h');
    assertCheck('Model status matches DEPLOY_CORRECTED', expProv.model_status === 'DEPLOY_CORRECTED');
    assertCheck('Valid time matches authoritative valid_time', expProv.valid_time === prov.authoritative_valid_time);
    assertCheck('Verification status matches authoritative status (VERIFIED)', expProv.verification_status === 'VERIFIED');
    assertCheck('Explanation mentions exact runtime rainfall', expText.includes(prov.authoritative_rainfall_mm.toFixed(2)) || expText.includes(String(prov.authoritative_rainfall_mm)));

    // 6. Confirm NO sample-data leakage (e.g. Bengaluru Urban or Karnataka into Meghalaya)
    console.log('\n6. Auditing for Sample Data Leakage into Meghalaya Request...');
    const lowerExp = expText.toLowerCase();
    const hasBengaluruLeak = lowerExp.includes('bengaluru') || lowerExp.includes('bangalore');
    const hasKarnatakaLeak = lowerExp.includes('karnataka') || lowerExp.includes('ka_blr');
    assertCheck('Zero leakage of "Bengaluru" into Meghalaya explanation', !hasBengaluruLeak);
    assertCheck('Zero leakage of "Karnataka" into Meghalaya explanation', !hasKarnatakaLeak);

    // 7. Test UNKNOWN hazard case
    console.log('\n7. Verifying UNKNOWN Hazard Case in Real Pipeline...');
    assertCheck('Flood risk is explicitly UNKNOWN in runtime hazard state', hazard.flood_risk?.risk_level === 'UNKNOWN');
    assertCheck('Road risk is explicitly UNKNOWN in runtime hazard state', hazard.road_risk?.risk_level === 'UNKNOWN');
    assertCheck('Explanation explicitly affirms flood risk is UNKNOWN / MODEL_UNAVAILABLE', expText.includes('UNKNOWN') || expText.includes('MODEL_UNAVAILABLE'));
    assertCheck('Explanation does NOT claim flood risk is safe', !lowerExp.includes('flood risk is safe') && !lowerExp.includes('safe from flood'));

    // 8. Test CUSTOM scenario case
    console.log('\n8. Testing CUSTOM Scenario Isolation in Real Pipeline...');
    const customImpactReq = new NextRequest('http://localhost:3000/api/impact', {
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
          rainfallMm: 85.0, // Caller hypothetical stress test
          durationHours: 24
        }
      })
    });

    const customImpactRes = await impactRouteHandler(customImpactReq);
    assertCheck('Custom scenario simulation returns HTTP 200', customImpactRes.status === 200);
    const customData = await customImpactRes.json();
    const customRuntime = customData.data;

    assertCheck('Custom simulation scenario is CUSTOM', customRuntime.scenario.type === 'CUSTOM');
    assertCheck('Authoritative forecast rainfall is UNTOUCHED by custom 85.0 mm', customRuntime.provenance.authoritative_rainfall_mm === prov.authoritative_rainfall_mm);

    const customExplainReq = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Explain this simulation run with the custom rainfall.',
        authoritativeState: customRuntime,
        districtId: 'ML_EAST_KHASI_HILLS'
      })
    });

    const customExplainRes = await explainRouteHandler(customExplainReq);
    assertCheck('Custom explain endpoint returns HTTP 200', customExplainRes.status === 200);
    const customExplainData = await customExplainRes.json();
    const customText = customExplainData.explanation;

    assertCheck('Explanation identifies 85.0 mm as hypothetical user CUSTOM scenario', customText.includes('CUSTOM') || customText.includes('85.0'));
    assertCheck('Authoritative meteorological forecast is preserved in explanation', customText.includes(prov.authoritative_rainfall_mm.toFixed(2)) || customText.includes(String(prov.authoritative_rainfall_mm)));

    // 9. Test WeatherNext provider behavior
    console.log('\n9. Testing WeatherNext Upstream Provider Behavior...');
    const wnImpactReq = new NextRequest('http://localhost:3000/api/impact', {
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

    const wnImpactRes = await impactRouteHandler(wnImpactReq);
    if (wnImpactRes.status === 200) {
      const wnJson = await wnImpactRes.json();
      assertCheck('WeatherNext returns valid authoritative data', wnJson.success === true);
      assertCheck('WeatherNext provider is preserved', wnJson.data.provenance.authoritative_provider.includes('weathernext'));
    } else {
      // In offline/unauthenticated GCS environment, WeatherNext strictly fails closed with HTTP 502
      assertCheck('WeatherNext upstream missing GCS run fails closed with HTTP 502', wnImpactRes.status === 502);
      const wnErr = await wnImpactRes.json();
      assertCheck('Response success is false (no mock data)', wnErr.success === false);
      assertCheck('Data is null', wnErr.data === null);
    }

    // 10. Test OpenRouter Unavailable Behavior
    console.log('\n10. Testing OpenRouter Unavailable Behavior (Fail-Closed)...');
    delete process.env.HAZARDGUARD_OFFLINE_LLM;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GROQ_API_KEY;

    const unavailReq = new NextRequest('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Explain risk.',
        authoritativeState: runtimeState,
        districtId: 'ML_EAST_KHASI_HILLS'
      })
    });

    const unavailRes = await explainRouteHandler(unavailReq);
    assertCheck('Returns HTTP 503 when OpenRouter is unconfigured/unavailable', unavailRes.status === 503);
    const unavailData = await unavailRes.json();
    assertCheck('Success is false', unavailData.success === false);
    assertCheck('Status is LLM_UNAVAILABLE', unavailData.status === 'LLM_UNAVAILABLE');
    assertCheck('Error message indicates unconfigured provider', unavailData.error.includes('not configured') || unavailData.error.includes('unavailable'));
    assertCheck('No fabricated canned advice is returned', !JSON.stringify(unavailData).includes('Follow IMD standard color-coded warnings'));

    console.log('\n=================================================================');
    console.log(`PRODUCTION SMOKE CHECK PASSED: ${passed}/${total} CHECKS VERIFIED`);
    console.log('REAL-PATH VERIFICATION: SUCCESS');
    console.log('=================================================================\n');
  } catch (err) {
    console.error('\nPRODUCTION SMOKE CHECK FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (sayanProc) {
      try { sayanProc.kill('SIGTERM'); } catch {}
    }
    if (soumyProc) {
      try { soumyProc.kill('SIGTERM'); } catch {}
    }
  }
}

runProductionSmokeCheck();
