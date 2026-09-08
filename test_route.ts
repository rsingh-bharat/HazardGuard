import { NextRequest } from 'next/server';
import { POST } from './app/api/impact/route';

async function runTests() {
    console.log("\n11. Testing Ronak Impact API Route (/api/impact)...");
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

    const bangaloreGeography = {
        districtId: 'KA_BLR_URBAN',
        bbox: [77.58, 12.89, 77.695, 12.98]
    };

    // --- Subtest 1: Missing geography fail-closed (HTTP 400) ---
    {
        const req = new NextRequest('http://localhost:3000/api/impact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const res = await POST(req);
        assertCheck("Route fails closed with HTTP 400 on missing geography", res.status === 400);
        const data = await res.json();
        assertCheck("Success is false", data.success === false);
        assertCheck("Error message mentions missing/invalid geography", typeof data.error === 'string' && data.error.includes('geography'));
        assertCheck("Data is null", data.data === null);
    }

    // --- Subtest 2: Sayan Down fail-closed (HTTP 503) ---
    {
        const origUrl = process.env.ML_SERVICE_URL;
        process.env.ML_SERVICE_URL = 'http://127.0.0.1:8999';
        try {
            const req = new NextRequest('http://localhost:3000/api/impact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geography: bangaloreGeography,
                    rainfall: { rainfallMm: 99.9 }
                })
            });
            const res = await POST(req);
            assertCheck("Route fails closed with HTTP 503 when Sayan is unreachable", res.status === 503);
            const data = await res.json();
            assertCheck("Success is false when Sayan is down", data.success === false);
            assertCheck("Error message indicates meteorological service unreachable", data.error.includes('Meteorological service unreachable'));
            assertCheck("No mock fallback returned when Sayan is down (data is null)", data.data === null);
        } finally {
            process.env.ML_SERVICE_URL = origUrl || 'http://127.0.0.1:8001';
        }
    }

    // --- Subtest 3: Soumy Down fail-closed (HTTP 503) ---
    {
        const origUrl = process.env.IMPACT_SERVICE_URL;
        process.env.IMPACT_SERVICE_URL = 'http://127.0.0.1:3999';
        try {
            const req = new NextRequest('http://localhost:3000/api/impact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geography: bangaloreGeography,
                    lead_time: 24
                })
            });
            const res = await POST(req);
            assertCheck("Route fails closed with HTTP 503 when Soumy is unreachable", res.status === 503);
            const data = await res.json();
            assertCheck("Success is false when Soumy is down", data.success === false);
            assertCheck("Error message indicates impact simulation service unreachable", data.error.includes('Impact simulation service unreachable'));
            assertCheck("No mock fallback returned when Soumy is down (data is null)", data.data === null);
        } finally {
            process.env.IMPACT_SERVICE_URL = origUrl || 'http://127.0.0.1:3001';
        }
    }

    // --- Subtest 4: Full E2E Success with Provenance & Hazard State ---
    {
        process.env.ML_SERVICE_URL = 'http://127.0.0.1:8001';
        process.env.IMPACT_SERVICE_URL = 'http://127.0.0.1:3001';
        const req = new NextRequest('http://localhost:3000/api/impact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geography: bangaloreGeography,
                lead_time: 24,
                provider: 'ecmwf_ifs',
                rainfall: { rainfallMm: 777.7 } // Hostile override attempt
            })
        });
        const res = await POST(req);
        assertCheck("Full E2E route returns HTTP 200", res.status === 200);
        const json = await res.json();
        assertCheck("Response success is true", json.success === true);
        const data = json.data;

        // Provenance checks
        const prov = data.provenance;
        assertCheck("Provenance object present in route response", !!prov);
        assertCheck("authoritative_snapshot_id preserved", typeof prov.authoritative_snapshot_id === 'string' && prov.authoritative_snapshot_id.length > 10);
        assertCheck("authoritative_model_id is hazardguard_v7_24h", prov.authoritative_model_id === 'hazardguard_v7_24h');
        assertCheck("authoritative_model_status is DEPLOY_CORRECTED", prov.authoritative_model_status === 'DEPLOY_CORRECTED');
        assertCheck("authoritative_verification_status is VERIFIED", prov.authoritative_verification_status === 'VERIFIED');
        assertCheck("authoritative_calibration_status is UNCALIBRATED_RAW_ENSEMBLE", prov.authoritative_calibration_status === 'UNCALIBRATED_RAW_ENSEMBLE');
        assertCheck("authoritative_probability_available is true", prov.authoritative_probability_available === true);
        assertCheck("authoritative_probability is finite in [0, 1]", typeof prov.authoritative_probability === 'number' && prov.authoritative_probability >= 0 && prov.authoritative_probability <= 1);
        assertCheck("Hostile caller rainfall 777.7 rejected - authoritative rainfall preserved", prov.authoritative_rainfall_mm !== 777.7);

        // Hazard semantics checks (separation of concerns)
        const hazard = data.authoritative_hazard;
        assertCheck("authoritative_hazard object present in route response", !!hazard);
        assertCheck("meteorological_intensity evaluated by Sayan", typeof hazard.meteorological_intensity?.risk_level === 'string');
        assertCheck("meteorological_intensity status is present", typeof hazard.meteorological_intensity?.status === 'string');
        assertCheck("flood_risk explicitly UNKNOWN", hazard.flood_risk?.risk_level === 'UNKNOWN');
        assertCheck("flood_risk status is FLOOD_MODEL_UNAVAILABLE", hazard.flood_risk?.status === 'FLOOD_MODEL_UNAVAILABLE');
        assertCheck("road_risk explicitly UNKNOWN", hazard.road_risk?.risk_level === 'UNKNOWN');
        assertCheck("road_risk status is DATA_UNAVAILABLE", hazard.road_risk?.status === 'DATA_UNAVAILABLE');
        assertCheck("infrastructure_risk explicitly UNKNOWN", hazard.infrastructure_risk?.risk_level === 'UNKNOWN');
        assertCheck("infrastructure_risk status is DATA_UNAVAILABLE", hazard.infrastructure_risk?.status === 'DATA_UNAVAILABLE');
        assertCheck("population_risk explicitly UNKNOWN", hazard.population_risk?.risk_level === 'UNKNOWN');
        assertCheck("population_risk status is DATA_UNAVAILABLE", hazard.population_risk?.status === 'DATA_UNAVAILABLE');

        // Soumy digital twin checks
        assertCheck("Soumy digital twin simulation_id present", typeof data.simulation_id === 'string');
        assertCheck("Soumy digital twin timeline present", Array.isArray(data.timeline) && data.timeline.length === 9);
        assertCheck("Soumy comparison matrix present", !!data.comparison?.BASE);
    }

    // --- Subtest 5: WeatherNext provider upstream fail-closed behavior ---
    {
        const req = new NextRequest('http://localhost:3000/api/impact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geography: bangaloreGeography,
                lead_time: 24,
                provider: 'weathernext_v1'
            })
        });
        const res = await POST(req);
        if (res.status === 200) {
            const json = await res.json();
            assertCheck("authoritative_provider is weathernext", json.data.provenance.authoritative_provider === 'weathernext3_statistics' || json.data.provenance.authoritative_provider === 'WeatherNext3');
        } else {
            assertCheck("WeatherNext upstream failure fails closed with HTTP 502", res.status === 502);
            const json = await res.json();
            assertCheck("Response success is false", json.success === false);
            assertCheck("Data is null (no mock fallback)", json.data === null);
        }
    }

    console.log(`\nAll ${passed}/${total} Route checks passed!`);
}

runTests().catch(err => {
    console.error("Route tests failed:", err);
    process.exit(1);
});
