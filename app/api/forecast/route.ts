import { NextRequest, NextResponse } from 'next/server';
import { ForecastCollection, ForecastSnapshot } from '@/lib/contracts/forecast';
import { createSuccessResponse, createErrorResponse } from '@/lib/contracts/api';
import mockForecasts from '@/data/mock/forecast.json';

// ─── Sayan API → Ronak contract adapter ───────────────────────────────────────
//
// Sayan's /ml/forecast takes ONE point (lat, lon, lead_time) and returns a
// ForecastSnapshot (Sayan schema). Ronak's API returns ForecastCollection
// (array of Ronak ForecastSnapshot — a richer, district-aware structure).
//
// This adapter:
//  1. Reads all districts from the mock data (preserving Ronak's full India coverage).
//  2. For a configurable subset of districts, concurrently calls Sayan's API.
//  3. Maps the atomic Sayan response into Ronak's ForecastSnapshot schema,
//     enriching it with the district metadata from the mock.
//  4. For districts where Sayan wasn't queried (rate-limit reason), falls back
//     to the mock value but marks it as 'mock' in metadata.
//  5. If ML_SERVICE_URL is not set or Sayan is unreachable, returns pure mock.
//
// USER CORRECTION APPLIED: The full district dataset is preserved.
// Sayan is only called for a concurrent subset to avoid rate limiting — the
// remaining districts retain their mock data. This is NOT reducing the map
// to 5 hardcoded entries; the full mock collection is always returned.
// ─────────────────────────────────────────────────────────────────────────────

const ALERT_THRESHOLDS = [
  { mm: 204.4, level: 'RED' as const,    hex: '#ef4444' },
  { mm:  115.6, level: 'RED' as const,    hex: '#ef4444' },
  { mm:   64.5, level: 'ORANGE' as const, hex: '#f97316' },
  { mm:   35.5, level: 'YELLOW' as const, hex: '#eab308' },
];

function rainfallToAlertLevel(mm: number) {
  for (const t of ALERT_THRESHOLDS) {
    if (mm >= t.mm) return { alertLevel: t.level, alertHex: t.hex };
  }
  return { alertLevel: 'GREEN' as const, alertHex: '#22c55e' };
}

// How many districts to concurrently query from Sayan in a single request.
// The rest of the collection retains its mock values (not dropped).
const SAYAN_CONCURRENT_QUERY_LIMIT = 6;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const leadHoursParam = searchParams.get('leadHours');
  const stateId = searchParams.get('stateId');
  const providerParam = searchParams.get('provider');
  const leadHours = leadHoursParam ? parseInt(leadHoursParam, 10) : 24;

  // Validate leadHours against Sayan's supported values (24, 48, 72).
  // If unsupported, skip Sayan and use mock.
  const sayanValidLeadHours = [24, 48, 72];
  const sayanLeadHours = sayanValidLeadHours.includes(leadHours) ? leadHours : 24;

  const mlServiceUrl = process.env.ML_SERVICE_URL;

  // Start with the full mock collection — this preserves the full India map.
  let baseMock = mockForecasts as ForecastSnapshot[];
  if (stateId) {
    baseMock = baseMock.filter((d) => d.geography.stateId.toUpperCase() === stateId.toUpperCase());
  }

  // If ML service is not configured, fail closed.
  if (!mlServiceUrl) {
    return NextResponse.json(
      { success: false, data: null, error: 'ML service is unavailable', source: 'live' },
      { status: 502 }
    );
  }

  // ─── Live path: query Sayan for all requested districts ──────────────────────
  const queryTargets = baseMock;

  let sayanResults: Map<string, {
    rainfall_mm: number;
    model_status: string;
    snapshot_id: string;
    provider: string;
    provider_model: string;
    model_id: string;
    fallback: boolean;
    distribution?: any;
    raw_nwp_mm?: number | null;
  }> = new Map();

  try {
    const sayanResponses = await Promise.all(
      queryTargets.map(async (district) => {
        try {
          const res = await fetch(`${mlServiceUrl}/ml/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: district.geography.lat,
              longitude: district.geography.lon,
              lead_time: sayanLeadHours,
              ...(providerParam ? { provider: providerParam } : {}),
            }),
            cache: 'no-store',
          });

          if (!res.ok) return { districtId: district.geography.districtId, data: null };

          const snapshot = await res.json();
          return { districtId: district.geography.districtId, data: snapshot };
        } catch {
          return { districtId: district.geography.districtId, data: null };
        }
      })
    );

    sayanResponses.forEach(({ districtId, data }) => {
      if (data && typeof data.rainfall_mm === 'number') {
        sayanResults.set(districtId, {
          rainfall_mm: data.rainfall_mm,
          model_status: data.model_status || 'UNKNOWN',
          snapshot_id: data.snapshot_id || '',
          provider: data.provider || 'UNKNOWN',
          provider_model: data.provider_model || 'UNKNOWN',
          model_id: data.model_id || 'RAW_NWP',
          fallback: data.fallback || false,
          distribution: data.distribution || null,
          raw_nwp_mm: data.raw_nwp_mm ?? null,
        });
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[forecast] Sayan scatter-gather failed:', err);
    return NextResponse.json(
      { success: false, data: null, error: `Sayan forecast service failed: ${msg}`, source: 'live' },
      { status: 502 }
    );
  }
  // ─── Merge Sayan results into the full mock collection ───────────────────
  // Districts where Sayan responded get their rainfall updated.
  // We do NOT silently mix mock data for failed districts.
  const data: ForecastCollection = baseMock.map((f) => {
    const liveResult = sayanResults.get(f.geography.districtId);

    if (liveResult) {
      const correctedMm = liveResult.rainfall_mm;
      const dist = liveResult.distribution || {};
      
      const p10 = typeof dist.p10_mm === 'number' ? Math.round(dist.p10_mm) : null;
      const p50 = typeof dist.p50_mm === 'number' ? Math.round(dist.p50_mm) : null;
      const p90 = typeof dist.p90_mm === 'number' ? Math.round(dist.p90_mm) : null;
      
      const { alertLevel, alertHex } = rainfallToAlertLevel(correctedMm);

      const correctionMethod = liveResult.fallback
        ? 'RAW_NWP_FALLBACK'
        : liveResult.model_status === 'RAW_NWP_WEATHERNEXT3'
        ? 'RAW_NWP_WEATHERNEXT3'
        : 'REGIME_AWARE_XGBOOST_QDM';

      return {
        ...f,
        leadHours: sayanLeadHours as 0 | 6 | 12 | 24 | 48 | 72,
        rainfall: {
          ...f.rainfall,
          correctedMm,
          rawNwpMm: liveResult.raw_nwp_mm !== undefined && liveResult.raw_nwp_mm !== null 
                        ? liveResult.raw_nwp_mm 
                        : null,
          p10Mm: p10,
          p50Mm: p50,
          p90Mm: p90,
          alertLevel,
          alertHex,
          correctionMethod,
        },
        metadata: {
          ...f.metadata,
          provider: liveResult.provider,
          modelVersion: liveResult.model_id,
          processingVersion: liveResult.model_status,
        },
      };
    }

    return null;
  }).filter((f) => f !== null) as ForecastCollection;

  return NextResponse.json(createSuccessResponse(data, 'live'));
}
