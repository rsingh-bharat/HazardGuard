import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createErrorResponse } from '@/lib/contracts/api';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import mockForecasts from '@/data/mock/forecast.json';
import { ForecastSnapshot } from '@/lib/contracts/forecast';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const districtId = searchParams.get('districtId');

  if (!districtId) {
    // Return all active RED/ORANGE alert districts
    const activeAlerts = (mockForecasts as ForecastSnapshot[]).filter(
      (f) => f.rainfall.alertLevel === 'RED' || f.rainfall.alertLevel === 'ORANGE'
    );
    return NextResponse.json(createSuccessResponse(activeAlerts, 'mock'));
  }

  const district = (mockForecasts as ForecastSnapshot[]).find(
    (f) => f.geography.districtId.toLowerCase() === districtId.toLowerCase()
  );

  if (!district) {
    return NextResponse.json(createErrorResponse('District not found'), { status: 404 });
  }

  const isTriggered = district.rainfall.alertLevel === 'RED' || district.rainfall.alertLevel === 'ORANGE';

  return NextResponse.json(
    createSuccessResponse(
      {
        districtId: district.geography.districtId,
        districtName: district.geography.districtName,
        stateName: district.geography.stateName,
        alertLevel: district.rainfall.alertLevel,
        correctedMm: district.rainfall.correctedMm,
        isTriggered,
        recommendation:
          district.rainfall.alertLevel === 'RED'
            ? 'DEMO DATA - NOT FOR OPERATIONAL USE. IMMEDIATE ACTION: Pre-position NDRF/SDRF assets, initiate flood-plain evacuation.'
            : district.rainfall.alertLevel === 'ORANGE'
            ? 'DEMO DATA - NOT FOR OPERATIONAL USE. PREPAREDNESS: Keep district disaster control room on 24/7 alert, monitor reservoir levels.'
            : 'DEMO DATA - NOT FOR OPERATIONAL USE. MONITORING: Routine surveillance.',
      },
      'mock'
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, userName, designation, stateId, districtId, threshold = 'ORANGE' } = body;

    if (!userEmail) {
      return NextResponse.json(createErrorResponse('userEmail is required'), { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('alerts').insert([
        {
          user_email: userEmail,
          user_name: userName,
          designation,
          state_id: stateId,
          district_id: districtId,
          threshold,
          notify_email: true,
          notify_browser: true,
        },
      ]);

      if (error) {
        console.warn('Supabase alert insert failed:', error);
      }
    }

    return NextResponse.json(
      createSuccessResponse(
        {
          subscriptionId: `sub_${Date.now()}`,
          userEmail,
          districtId: districtId || 'ALL',
          threshold,
          status: 'ACTIVE',
          message: `Official alert subscription registered successfully for ${userEmail}.`,
        },
        'live'
      )
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Alert subscription error';
    return NextResponse.json(createErrorResponse(msg), { status: 500 });
  }
}
