import { NextRequest, NextResponse } from 'next/server';
import { ImpactRequest, ImpactSimulationResult, AuthoritativeHazardState } from '@/lib/contracts/impact';
import { createSuccessResponse, createErrorResponse } from '@/lib/contracts/api';

// ─── Impact API Route ─────────────────────────────────────────────────────────
//
// Pipeline: Sayan (ML / Meteorological Authority) → Soumy (3D Impact Twin) → UI
//
// Scientific Integrity Rules Enforced:
//  P0-1: FAIL-CLOSED. NO authoritative Sayan snapshot = NO simulation.
//        Caller-controlled body.rainfall.rainfallMm is NEVER injected or used
//        to fabricate or replace an authoritative forecast.
//  P0-2: Physics-calibrated mock fallback (0.72/1.38 multipliers, fake P10/P50/P90,
//        fabricated exposure numbers, fake severity) is completely removed.
//  P0-3: Separation of concerns. Sayan is authoritative for meteorological forecast,
//        probability, verification, and hazard classification.
//        Unsupported consequence models (flood, road, infrastructure, population)
//        are explicitly UNKNOWN / DATA_UNAVAILABLE / FLOOD_MODEL_UNAVAILABLE.
//        Soumy output is digital-twin simulation output and never promoted to
//        unvalidated authoritative hazard determinations.
//  P1:   Authoritative probability and verification semantics are queried and preserved.
//        If probability is unavailable (e.g. WeatherNext3 spatial statistics),
//        it is explicitly represented as unavailable (never turned into 0%).
//  P2:   Failures from Sayan or Soumy return explicit 502/503 error responses rather
//        than swallowing errors into fallback mock numbers.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body: ImpactRequest = await request.json();

    // ─── 0. Request Validation ────────────────────────────────────────────────
    if (
      !body ||
      !body.geography ||
      !Array.isArray(body.geography.bbox) ||
      body.geography.bbox.length !== 4 ||
      !body.geography.districtId
    ) {
      return NextResponse.json(
        createErrorResponse('Invalid impact simulation request: missing or invalid geography and bbox', null, 'live'),
        { status: 400 }
      );
    }

    const lat = (body.geography.bbox[1] + body.geography.bbox[3]) / 2;
    const lon = (body.geography.bbox[0] + body.geography.bbox[2]) / 2;

    const mlServiceUrl = process.env.ML_SERVICE_URL || process.env.SAYAN_ML_URL || 'http://localhost:8001';
    const impactServiceUrl = process.env.IMPACT_SERVICE_URL || process.env.SOUMY_IMPACT_URL || 'http://localhost:8002';

    // ─── 1. Authoritative Forecast from Sayan (/ml/forecast) ──────────────────
    // Exactly one authoritative rainfall source. Fail closed if Sayan fails.
    let reqProvider = body.provider || (body as any).forecast?.provider;
    if (reqProvider === 'weathernext_v1' || reqProvider === 'weathernext' || reqProvider === 'weathernext3') {
      reqProvider = 'weathernext3_statistics';
    } else if (reqProvider === 'ecmwf') {
      reqProvider = 'ecmwf_ifs';
    }

    let forecastRes: Response;
    try {
      forecastRes = await fetch(`${mlServiceUrl}/ml/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          lead_time: 24,
          ...(reqProvider ? { provider: reqProvider } : {})
        }),
        cache: 'no-store'
      });
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('[impact] Upstream Sayan ML service unreachable:', msg);
      return NextResponse.json(
        createErrorResponse(`Meteorological service unreachable: ${msg}`, null, 'live'),
        { status: 503 }
      );
    }

    if (!forecastRes.ok) {
      const errText = await forecastRes.text();
      console.error('[impact] Sayan /ml/forecast returned non-OK status:', forecastRes.status, errText);
      return NextResponse.json(
        createErrorResponse(`Authoritative forecast provider error (${forecastRes.status}): ${errText}`, null, 'live'),
        { status: 502 }
      );
    }

    const authoritativeSnapshot = await forecastRes.json();
    if (
      !authoritativeSnapshot ||
      typeof authoritativeSnapshot.snapshot_id !== 'string' ||
      typeof authoritativeSnapshot.rainfall_mm !== 'number' ||
      !Number.isFinite(authoritativeSnapshot.rainfall_mm)
    ) {
      console.error('[impact] Sayan /ml/forecast returned malformed snapshot:', authoritativeSnapshot);
      return NextResponse.json(
        createErrorResponse('Malformed authoritative snapshot returned by meteorological service', null, 'live'),
        { status: 502 }
      );
    }

    // ─── 2. Sayan Probability, Verification & Hazard Semantics ───────────────
    let probData: any = null;
    let verifyData: any = null;
    let authoritativeHazard: AuthoritativeHazardState | null = null;

    try {
      const [probRes, verifyRes] = await Promise.all([
        fetch(`${mlServiceUrl}/ml/probability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authoritativeSnapshot),
          cache: 'no-store'
        }).catch(e => {
          console.warn('[impact] /ml/probability fetch error:', e);
          return null;
        }),
        fetch(`${mlServiceUrl}/ml/verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authoritativeSnapshot),
          cache: 'no-store'
        }).catch(e => {
          console.warn('[impact] /ml/verification fetch error:', e);
          return null;
        })
      ]);

      if (probRes && probRes.ok) {
        probData = await probRes.json();
      }
      if (verifyRes && verifyRes.ok) {
        verifyData = await verifyRes.json();
      }

      // Query Sayan /ml/impact for authoritative hazard classification
      const probAvailable = Boolean(probData?.probability_available);
      const probValue = probAvailable && typeof probData?.probability === 'number' ? probData.probability : 0.0;
      const vStatus = verifyData?.verification_status === 'VERIFIED' ? 'VERIFIED' : 'NOT_VALIDATED';

      const impactRes = await fetch(`${mlServiceUrl}/ml/impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: authoritativeSnapshot.snapshot_id,
          timestamp: authoritativeSnapshot.timestamp,
          latitude: authoritativeSnapshot.latitude,
          longitude: authoritativeSnapshot.longitude,
          lead_hours: authoritativeSnapshot.lead_hours,
          rainfall_mm: authoritativeSnapshot.rainfall_mm,
          event_probability: probValue,
          probability_available: probAvailable,
          event_threshold_mm: 15.6,
          model_id: authoritativeSnapshot.model_id,
          model_status: authoritativeSnapshot.model_status,
          fallback: authoritativeSnapshot.fallback,
          fallback_reason: authoritativeSnapshot.fallback_reason,
          verification_status: vStatus
        }),
        cache: 'no-store'
      }).catch(e => {
        console.warn('[impact] /ml/impact fetch error:', e);
        return null;
      });

      if (impactRes && impactRes.ok) {
        authoritativeHazard = await impactRes.json();
      }
    } catch (semanticsErr) {
      console.warn('[impact] Secondary Sayan semantics retrieval error:', semanticsErr);
    }

    if (!authoritativeHazard) {
      console.error('[impact] Sayan /ml/impact authoritative hazard classification failed or returned null');
      return NextResponse.json(
        createErrorResponse('DATA_UNAVAILABLE: Authoritative hazard classification could not be retrieved from Sayan ML service.', null, 'live'),
        { status: 502 }
      );
    }

    // ─── 3. Call Soumy 3D Impact Twin Simulation ──────────────────────────────
    // P0-1: authoritative_forecast is ALWAYS passed.
    // Caller-controlled body.rainfall.rainfallMm is NEVER passed as authoritative rainfall.
    const isCustomScenario = body.rainfall?.scenario === 'CUSTOM';
    const soumyPayload = {
      authoritative_forecast: {
        ...authoritativeSnapshot,
        verification_status: verifyData?.verification_status || 'NOT_VALIDATED',
        probability_available: probData?.probability_available ?? false,
        probability: probData?.probability_available ? probData.probability : null,
        calibration_status: probData?.calibration_status || null,
      },
      forecast: {
        forecast_id: body.forecastId || authoritativeSnapshot.snapshot_id,
        state_id: body.geography.districtId.split('_')[0],
        district_id: body.geography.districtId,
        bbox: body.geography.bbox,
      },
      scenario_type: body.rainfall?.scenario || 'HIGH',
      custom_rainfall_mm: isCustomScenario ? body.rainfall?.rainfallMm : undefined,
      duration_hours: body.rainfall?.durationHours || 24,
      timestep_hours: 3,
    };

    let soumyRes: Response;
    try {
      soumyRes = await fetch(`${impactServiceUrl}/api/impact/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(soumyPayload),
        cache: 'no-store',
      });
    } catch (soumyErr: unknown) {
      const msg = soumyErr instanceof Error ? soumyErr.message : String(soumyErr);
      console.error('[impact] Soumy impact engine unreachable:', msg);
      return NextResponse.json(
        createErrorResponse(`Impact simulation service unreachable: ${msg}`, null, 'live'),
        { status: 503 }
      );
    }

    if (!soumyRes.ok) {
      const errText = await soumyRes.text();
      console.error('[impact] Soumy engine returned error:', soumyRes.status, errText);
      return NextResponse.json(
        createErrorResponse(`Impact simulation engine error (${soumyRes.status}): ${errText}`, null, 'live'),
        { status: 502 }
      );
    }

    const data: ImpactSimulationResult = await soumyRes.json();

    // ─── 4. Provenance & Hazard Semantics Preservation ─────────────────────────
    // P0-3 & P1: Provenance and authoritative semantics survive across boundary.
    if (!data.provenance) {
      (data as any).provenance = {} as any;
    }
    const prov = data.provenance;
    prov.authoritative_snapshot_id = authoritativeSnapshot.snapshot_id;
    prov.authoritative_model_id = authoritativeSnapshot.model_id;
    prov.authoritative_fallback = authoritativeSnapshot.fallback;
    prov.authoritative_provider = authoritativeSnapshot.provider;
    prov.authoritative_rainfall_mm = authoritativeSnapshot.rainfall_mm;
    prov.authoritative_valid_time = authoritativeSnapshot.nwp_valid_time;
    prov.authoritative_init_time = authoritativeSnapshot.nwp_initialization_time;
    prov.authoritative_model_status = authoritativeSnapshot.model_status;
    prov.authoritative_verification_status = verifyData?.verification_status || 'NOT_VALIDATED';
    prov.authoritative_probability_available = probData?.probability_available ?? false;
    prov.authoritative_probability = (probData?.probability_available ? probData.probability : null);
    prov.authoritative_calibration_status = probData?.calibration_status || (probData?.probability_available ? 'UNCALIBRATED_RAW_ENSEMBLE' : 'UNAVAILABLE');

    // Attach authoritative hazard state from Sayan
    data.authoritative_hazard = authoritativeHazard;

    return NextResponse.json(createSuccessResponse(data, 'live'));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Invalid impact simulation request';
    console.error('[impact] Unexpected error processing impact simulation:', msg);
    return NextResponse.json(createErrorResponse(msg, null, 'live'), { status: 500 });
  }
}
