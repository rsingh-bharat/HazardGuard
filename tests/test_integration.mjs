import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("=================================================================");
    console.log("HAZARDGUARD PRE-SHIP E2E INTEGRATION & PROVENANCE VALIDATION");
    console.log("=================================================================\n");

    console.log("1. Starting Sayan's ML Service (handoff2) on port 8001...");
    const pythonBin = path.join(__dirname, '..', '.venv', 'bin', 'python');
    const handoff = spawn(pythonBin, ['-m', 'uvicorn', 'services.ml_api.main:app', '--port', '8001'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PYTHONPATH: path.join(__dirname, '..') },
        shell: true
    });
    
    console.log("2. Starting Soumy's Impact Service (impact_engine) on port 3001...");
    const impact = spawn('npx', ['tsx', 'services/impact_engine/server.ts'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: '3001', PYTHONPATH: path.join(__dirname, '..') },
        shell: true
    });

    // Wait for servers to initialize
    await sleep(6500);

    let passedTests = 0;
    let totalTests = 0;

    function assertCheck(desc, condition) {
        totalTests++;
        if (condition) {
            console.log(`   [PASS] ${desc}`);
            passedTests++;
        } else {
            console.error(`   [FAIL] ${desc}`);
            throw new Error(`Assertion failed: ${desc}`);
        }
    }

    try {
        // --- Step 3A: Sayan Default ECMWF (+24h DEPLOY_CORRECTED) ---
        console.log("\n3. Testing Sayan ML Service: Operational +24h Forecast (ECMWF)...");
        const fc24Res = await fetch('http://127.0.0.1:8001/ml/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: 12.9716,
                longitude: 77.5946,
                lead_time: 24
            })
        });
        assertCheck("Sayan +24h endpoint returns HTTP 200", fc24Res.ok);
        const snapshot24 = await fc24Res.json();
        
        assertCheck("Snapshot has valid snapshot_id UUID", typeof snapshot24.snapshot_id === 'string' && snapshot24.snapshot_id.length > 10);
        assertCheck("Default provider is ecmwf_ifs", snapshot24.provider === 'ecmwf_ifs');
        assertCheck("Deployed model is hazardguard_v7_24h", snapshot24.model_id === 'hazardguard_v7_24h');
        assertCheck("Model status is DEPLOY_CORRECTED", snapshot24.model_status === 'DEPLOY_CORRECTED');
        assertCheck("Fallback is False for +24h", snapshot24.fallback === false);
        assertCheck("ML correction applied is True", snapshot24.ml_correction_applied === true);
        assertCheck("Rainfall mm is finite and non-negative", Number.isFinite(snapshot24.rainfall_mm) && snapshot24.rainfall_mm >= 0);
        assertCheck("Distribution type is SINGLE_VALUE for deterministic run", snapshot24.distribution_type === 'SINGLE_VALUE');

        // --- Step 3B: Sayan Safety Gate Fallback (+48h FALLBACK_RAW_NWP) ---
        console.log("\n4. Testing Sayan ML Service: +48h Safety Gate Enforcement (ECMWF)...");
        const fc48Res = await fetch('http://127.0.0.1:8001/ml/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: 12.9716,
                longitude: 77.5946,
                lead_time: 48
            })
        });
        assertCheck("Sayan +48h endpoint returns HTTP 200", fc48Res.ok);
        const snapshot48 = await fc48Res.json();
        assertCheck("Model status is FALLBACK_RAW_NWP for +48h", snapshot48.model_status === 'FALLBACK_RAW_NWP');
        assertCheck("Fallback is True for +48h", snapshot48.fallback === true);
        assertCheck("ML correction applied is False", snapshot48.ml_correction_applied === false);

        // --- Step 3C: Provider Runtime Selection Validation ---
        console.log("\n5. Testing Upstream NWP Provider Selection Validation...");
        const fcBadProv = await fetch('http://127.0.0.1:8001/ml/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: 12.9716,
                longitude: 77.5946,
                lead_time: 24,
                provider: "invalid_unsupported_provider"
            })
        });
        assertCheck("Invalid provider string rejected with HTTP 422", fcBadProv.status === 422);

        const fcEcmwfExplicit = await fetch('http://127.0.0.1:8001/ml/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: 12.9716,
                longitude: 77.5946,
                lead_time: 24,
                provider: "ecmwf_ifs"
            })
        });
        assertCheck("Explicit ecmwf_ifs returns HTTP 200", fcEcmwfExplicit.ok);
        const snapEcmwf = await fcEcmwfExplicit.json();
        assertCheck("Provider matches ecmwf_ifs", snapEcmwf.provider === "ecmwf_ifs");

        // --- Step 3D: Sayan Probability Endpoint ---
        console.log("\n6. Testing Sayan Probability Endpoint (/ml/probability)...");
        const probRes = await fetch('http://127.0.0.1:8001/ml/probability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot24)
        });
        assertCheck("Probability endpoint returns HTTP 200", probRes.ok);
        const probData = await probRes.json();
        assertCheck("Snapshot ID matches originating forecast", probData.snapshot_id === snapshot24.snapshot_id);
        assertCheck("Threshold is authoritative IMD Moderate (15.6 mm)", probData.threshold_mm === 15.6);
        assertCheck("Calibration status is UNCALIBRATED_RAW_ENSEMBLE", probData.calibration_status === "UNCALIBRATED_RAW_ENSEMBLE");
        assertCheck("Probability is within [0.0, 1.0]", probData.probability >= 0.0 && probData.probability <= 1.0);

        // --- Step 3E: Sayan Verification Endpoint ---
        console.log("\n7. Testing Sayan Offline Verification Endpoint (/ml/verification)...");
        const verifyRes = await fetch('http://127.0.0.1:8001/ml/verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot24)
        });
        assertCheck("Verification endpoint returns HTTP 200", verifyRes.ok);
        const verifyData = await verifyRes.json();
        assertCheck("Verification snapshot ID matches", verifyData.snapshot_id === snapshot24.snapshot_id);
        assertCheck("Verification status is VERIFIED for +24h", verifyData.verification_status === "VERIFIED");
        assertCheck("FSS is strictly null (unvalidated)", verifyData.FSS === null);
        assertCheck("FSS status is strictly FSS_NOT_VALIDATED", verifyData.FSS_status === "FSS_NOT_VALIDATED");
        assertCheck("CSI metric is present for heavy rain", verifyData.CSI !== null && verifyData.CSI !== undefined);

        // --- Step 4: Soumy Impact Engine Simulation with Full Authoritative Provenance ---
        console.log("\n8. Testing Soumy 3D Impact Engine (/api/impact/simulate)...");
        const impactRes = await fetch('http://127.0.0.1:3001/api/impact/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                authoritative_forecast: {
                    ...snapshot24,
                    verification_status: verifyData.verification_status,
                    probability: probData.probability,
                    probability_available: true,
                    calibration_status: probData.calibration_status
                }, // FULL AUTHORITATIVE PROVENANCE ANCHOR
                forecast: {
                    forecast_id: "FC-E2E-TEST-2026",
                    state_id: "KA",
                    district_id: "KA_BLR_URBAN",
                    bbox: [77.58, 12.89, 77.695, 12.98]
                },
                scenario_type: 'HIGH',
                duration_hours: 24,
                timestep_hours: 3
            })
        });
        assertCheck("Impact simulate endpoint returns HTTP 200", impactRes.ok);
        const impactResult = await impactRes.json();

        assertCheck("ImpactResult has simulation_id", typeof impactResult.simulation_id === 'string');
        assertCheck("Timeline contains 9 timesteps (T+0 through T+24)", impactResult.timeline && impactResult.timeline.length === 9);
        assertCheck("Peak water depth is finite", Number.isFinite(impactResult.summary.peak_water_depth_m));

        // --- Step 5: Verify Authoritative Provenance Handoff across the Boundary ---
        console.log("\n9. Verifying Authoritative Provenance Survival across Boundary...");
        const prov = impactResult.provenance;
        assertCheck("authoritative_snapshot_id preserved", prov.authoritative_snapshot_id === snapshot24.snapshot_id);
        assertCheck("authoritative_model_id preserved", prov.authoritative_model_id === snapshot24.model_id);
        assertCheck("authoritative_fallback preserved", prov.authoritative_fallback === snapshot24.fallback);
        assertCheck("authoritative_provider preserved", prov.authoritative_provider === snapshot24.provider);
        assertCheck("authoritative_rainfall_mm preserved", prov.authoritative_rainfall_mm === snapshot24.rainfall_mm);
        assertCheck("authoritative_valid_time preserved", prov.authoritative_valid_time === snapshot24.nwp_valid_time);
        assertCheck("authoritative_model_status preserved", prov.authoritative_model_status === snapshot24.model_status);
        assertCheck("authoritative_verification_status preserved", prov.authoritative_verification_status === "VERIFIED");
        assertCheck("authoritative_calibration_status preserved", prov.authoritative_calibration_status === "UNCALIBRATED_RAW_ENSEMBLE");
        assertCheck("authoritative_probability_available preserved", prov.authoritative_probability_available === true);
        assertCheck("authoritative_probability preserved", typeof prov.authoritative_probability === 'number' && prov.authoritative_probability >= 0);

        // --- Step 6: Verify Deterministic Scenario Comparison Matrix ---
        console.log("\n10. Verifying Scenario Comparison Matrix (LOW, BASE, HIGH)...");
        const comp = impactResult.comparison;
        assertCheck("Comparison matrix has LOW scenario", !!comp.LOW);
        assertCheck("Comparison matrix has BASE scenario", !!comp.BASE);
        assertCheck("Comparison matrix has HIGH scenario", !!comp.HIGH);
        assertCheck(
            "Monotonic rainfall: HIGH >= BASE >= LOW",
            comp.HIGH.rainfall_mm >= comp.BASE.rainfall_mm && comp.BASE.rainfall_mm >= comp.LOW.rainfall_mm
        );
        assertCheck(
            "Monotonic water depth: HIGH >= LOW",
            comp.HIGH.peak_water_depth_m >= comp.LOW.peak_water_depth_m
        );

        // --- Step 7: Test Ronak's Next.js /api/impact Route Boundary ---
        const { execSync } = await import('child_process');
        execSync('npx tsx test_route.ts', {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
            env: {
                ...process.env,
                SAYAN_ML_URL: 'http://127.0.0.1:8001',
                SOUMY_IMPACT_URL: 'http://127.0.0.1:3001'
            }
        });
        assertCheck("Ronak /api/impact route boundary test suite succeeded", true);

        console.log("\n=================================================================");
        console.log(`ALL INTEGRATION CHECKS PASSED: ${passedTests}/${totalTests} CHECKS VERIFIED`);
        console.log("E2E PIPELINE STATUS: PASS");
        console.log("=================================================================\n");
    } catch (e) {
        console.error("\nINTEGRATION FAILED:", e);
        process.exitCode = 1;
    } finally {
        try { handoff.kill('SIGTERM'); } catch {}
        try { impact.kill('SIGTERM'); } catch {}
        process.exit(process.exitCode || 0);
    }
}

run();
