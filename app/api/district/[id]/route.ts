import { NextRequest, NextResponse } from 'next/server';
import { DistrictDetail } from '@/lib/contracts/district';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { createSuccessResponse } from '@/lib/contracts/api';
import mockDistrict from '@/data/mock/district.json';
import mockForecasts from '@/data/mock/forecast.json';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const districtId = params.id;
  const searchParams = request.nextUrl.searchParams;
  const forecastId = searchParams.get('forecastId');

  const mlServiceUrl = process.env.ML_SERVICE_URL;

  if (mlServiceUrl) {
    try {
      const response = await fetch(`${mlServiceUrl}/ml/district/${districtId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ districtId, forecastId }),
        cache: 'no-store',
      });

      if (response.ok) {
        const data: DistrictDetail = await response.json();
        return NextResponse.json(createSuccessResponse(data, 'live'));
      } else {
        throw new Error(`Sayan district service returned ${response.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('ML Service unreachable for district:', err);
      return NextResponse.json(
        { success: false, data: null, error: `District service failed: ${msg}`, source: 'live' },
        { status: 502 }
      );
    }
  }

  // If no ML service URL is configured at all, fail closed instead of mocking
  return NextResponse.json(
    { success: false, data: null, error: 'ML_SERVICE_URL not configured', source: 'live' },
    { status: 503 }
  );
}
