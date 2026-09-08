import { NextRequest, NextResponse } from 'next/server';
import { generateExplanation } from '@/lib/ai/explanationService';

/**
 * Chat / Conversational Endpoint:
 * POST /api/chat
 * 
 * Uses the exact same unified Explanation Service as /api/explain to ensure:
 * 1. Absolute numerical grounding from ScientificContext.
 * 2. Real-time retrieval of authoritative Obsidian knowledge notes.
 * 3. Strict server-side OpenRouter invocation with negative constraints.
 * 4. Zero fabricated mock fallbacks when services are unavailable.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      query,
      scientificContext,
      authoritativeState,
      forecastSnapshot,
      probabilityData,
      verificationData,
      hazardState,
      districtId,
      history = []
    } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          status: 'INVALID_REQUEST',
          error: 'Query string is required.',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Call unified explanation service
    const result = await generateExplanation({
      query: query.trim(),
      scientificContext,
      authoritativeState,
      forecastSnapshot,
      probabilityData,
      verificationData,
      hazardState,
      districtId,
      history
    });

    if (!result.success) {
      const statusCode = result.status === 'DATA_UNAVAILABLE' ? 400 : 503;
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          error: result.error,
          reply: `⚠️ MeghDoot Service Unavailable: ${result.error}`,
          timestamp: result.timestamp
        },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      reply: result.explanation,
      explanation: result.explanation,
      structured_data_status: result.structured_data_status,
      provenance: result.provenance,
      retrieved_references: result.retrieved_references,
      hazards_summary: result.hazards_summary,
      contextUsed: [
        `Snapshot: ${result.provenance.snapshot_id}`,
        `Model: ${result.provenance.model_id} (${result.provenance.model_status})`,
        `Verification: ${result.provenance.verification_status}`,
        ...result.retrieved_references.map((r) => `Knowledge: ${r.title}`)
      ],
      timestamp: result.timestamp
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        status: 'ERROR',
        error: `Chat endpoint failure: ${msg}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
