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
    const { stateId = 'MH', districtId = null, forecastId = 'forecast_20260901_00z', includeImpact = true, includeVerification = true, forecasts: clientForecasts } = body;

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

    let forecasts = clientForecasts && clientForecasts.length > 0 
      ? clientForecasts 
      : (districtId
        ? (mockForecasts as ForecastSnapshot[]).filter(
            (f) => f.geography.districtId.toUpperCase() === districtId.toUpperCase()
          )
        : (mockForecasts as ForecastSnapshot[]).filter(
            (f) => f.geography.stateId.toUpperCase() === stateId.toUpperCase()
          ));

    if (forecasts.length === 0) {
      forecasts = mockForecasts as ForecastSnapshot[];
    }
    
    // Filter by district if we received full state forecasts from client
    if (clientForecasts && clientForecasts.length > 0 && districtId) {
       forecasts = forecasts.filter((f: ForecastSnapshot) => f.geography.districtId.toUpperCase() === districtId.toUpperCase());
       if (forecasts.length === 0) forecasts = clientForecasts; // fallback if filtering fails
    }

    const verification = includeVerification ? (mockVerification as VerificationResult[]) : [];
    const impact = includeImpact ? (mockImpact as ImpactResult) : null;

    // @react-pdf/renderer v3 uses its own internal element type that diverges
    // from React.ReactElement — cast to any to satisfy renderToBuffer's signature.
    const pdfBuffer = await renderToBuffer(
      React.createElement(ReportDocument, {
        stateName,
        forecastId,
        forecasts,
        verification,
        impact,
      }) as any
    );

    const reportId = `rep_${stateId}_${Date.now()}`;
    const filename = `${stateName.replace(/\s+/g, '_')}_Rainfall_Outlook.pdf`;

    // Optionally audit report in Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('reports').insert([
          {
            id: reportId,
            state_id: stateId,
            forecast_id: forecastId,
            page_count: 5,
            file_size_bytes: pdfBuffer.byteLength,
          },
        ]);
      } catch (dbErr) {
        console.warn('Supabase audit log skipped:', dbErr);
      }
    }

    // Convert Buffer → Uint8Array for NextResponse (BodyInit compatibility)
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
