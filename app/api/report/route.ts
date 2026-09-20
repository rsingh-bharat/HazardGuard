import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportDocument } from '@/components/reports/ReportDocument';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { VerificationResult } from '@/lib/contracts/verification';
import { ImpactResult } from '@/lib/contracts/impact';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import mockForecasts from '@/data/mock/forecast.json';
import mockVerification from '@/data/mock/verification.json';
import mockImpact from '@/data/mock/impact.json';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      stateId = 'MH', 
      districtId = null, 
      forecastId = 'forecast_20260901_00z', 
      includeImpact = true, 
      includeVerification = true, 
      forecasts: clientForecasts 
    } = body;

    const stateMap: Record<string, string> = {
      MH: 'Maharashtra',
      KL: 'Kerala',
      OR: 'Odisha',
      GJ: 'Gujarat',
      AS: 'Assam',
      UT: 'Uttarakhand',
      HP: 'Himachal Pradesh',
      WB: 'West Bengal',
      AP: 'Andhra Pradesh',
      TS: 'Telangana',
      TN: 'Tamil Nadu',
      KA: 'Karnataka',
      BR: 'Bihar',
      MP: 'Madhya Pradesh',
      RJ: 'Rajasthan',
      UP: 'Uttar Pradesh',
    };

    const stateName = stateMap[stateId.toUpperCase()] || stateId;

    // Source of truth: clientForecasts if valid, else mock data.
    let baseForecasts = (clientForecasts && clientForecasts.length > 0)
      ? clientForecasts
      : (mockForecasts as ForecastSnapshot[]);

    // 1. MUST FILTER BY STATE ID ALWAYS
    let scopedForecasts = baseForecasts.filter(
      (f: ForecastSnapshot) => f.geography.stateId.toUpperCase() === stateId.toUpperCase()
    );

    // 2. IF DISTRICT IS SELECTED, FILTER TO JUST THAT DISTRICT
    if (districtId) {
      scopedForecasts = scopedForecasts.filter(
        (f: ForecastSnapshot) => f.geography.districtId.toUpperCase() === districtId.toUpperCase()
      );
    }

    if (scopedForecasts.length === 0) {
      return NextResponse.json({ error: 'No data available for the selected scope.' }, { status: 400 });
    }
    
    // Find district name if available
    const districtName = districtId ? scopedForecasts[0].geography.districtName : undefined;

    const verification = includeVerification ? (mockVerification as VerificationResult[]) : [];
    const impact = includeImpact ? (mockImpact as ImpactResult) : null;

    // @react-pdf/renderer v3 uses its own internal element type that diverges
    // from React.ReactElement — cast to any to satisfy renderToBuffer's signature.
    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportDocument, {
        stateName,
        forecastId,
        forecasts: scopedForecasts,
        verification,
        impact,
      }) as any
    );

    const reportId = `rep_${stateId}_${Date.now()}`;
    const filename = districtName
      ? `${districtName.replace(/\s+/g, '_')}_${stateName.replace(/\s+/g, '_')}_Bulletin.pdf`
      : `${stateName.replace(/\s+/g, '_')}_Rainfall_Outlook.pdf`;

    // Optionally audit report in Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('reports').insert([
          {
            id: reportId,
            state_id: stateId,
            district_id: districtId,
            forecast_id: forecastId,
            page_count: 5,
            file_size_bytes: pdfBuffer.byteLength,
          },
        ]);
      } catch (dbErr) {
        console.warn('Supabase audit log skipped:', dbErr);
      }
    }

    // Convert Buffer -> Uint8Array for NextResponse (BodyInit compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('Report Generation Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
