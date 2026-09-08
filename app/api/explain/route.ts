import { NextRequest, NextResponse } from 'next/server';
import { generateExplanation } from '@/lib/ai/explanationService';

/**
 * Dedicated RAG Explanation Endpoint:
 * POST /api/explain
 * 
 * Target Architecture:
 * Authoritative structured application state -> ScientificContext -> Obsidian Knowledge -> OpenRouter -> ExplanationResponse
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        {
          success: false,
          status: 'DATA_UNAVAILABLE',
          error: 'Missing request body. Authoritative scientific context or forecast snapshot required.',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const result = await generateExplanation({
      query: body.query || 'Explain current meteorological risk and scientific status.',
      scientificContext: body.scientificContext,
      authoritativeState: body.authoritativeState,
      forecastSnapshot: body.forecastSnapshot,
      probabilityData: body.probabilityData,
      verificationData: body.verificationData,
      hazardState: body.hazardState,
      districtId: body.districtId,
      history: body.history
    });

    if (!result.success) {
      const statusCode = result.status === 'DATA_UNAVAILABLE' ? 400 : 503;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        status: 'ERROR',
        error: `Unexpected error during explanation generation: ${msg}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
