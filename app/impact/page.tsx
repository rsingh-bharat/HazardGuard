'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import { useShareableState } from '@/lib/state/useShareableState';
import { CityId, ScenarioType } from '@/lib/contracts/impact';

// Dynamic import with SSR disabled â€” CRITICAL to prevent Three.js / window crash.
// Three.js accesses the DOM on import; Next.js SSR has no DOM.
const ImpactTwinView = nextDynamic(
  () => import('@/components/impact/ImpactTwinView'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center h-full" style={{ background: "#04121b" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-chartreuse/40 border-t-chartreuse rounded-full animate-spin" />
          <p className="text-[11px] font-mono text-smoke uppercase tracking-widest">
            INITIALISING 3D TWIN ENGINEâ€¦
          </p>
        </div>
      </div>
    )
  }
);

// District â†’ City mapping for the 3D Twin city switcher
const DISTRICT_TO_CITY: Record<string, CityId> = {
  'KA_BLR_URBAN':          'bengaluru',
  'KA_BLR_RURAL':          'bengaluru',
  'MH_MUMBAI_CITY':        'mumbai',
  'MH_MUMBAI_SUBURBAN':    'mumbai',
  'MH_PUNE':               'mumbai',
  'DL_CENTRAL_YAMUNA':     'delhi',
  'DL_NEW_DELHI':          'delhi',
  'DL_NORTH_EAST':         'delhi',
};

function resolveCity(districtId: string | null): CityId {
  if (districtId && DISTRICT_TO_CITY[districtId]) {
    return DISTRICT_TO_CITY[districtId];
  }
  return 'bengaluru';
}

export default function ImpactPage() {
  const { selectedDistrictId, activeForecastId, activeScenario } = useShareableState();

  const resolvedCity = resolveCity(selectedDistrictId);
  const resolvedScenario: ScenarioType = activeScenario || 'P90';

  return (
    <div className="w-full h-screen overflow-hidden ">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center h-full" style={{ background: "#04121b" }}>
          <p style={{ color: "rgba(255,255,255,.55)", fontFamily: "monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading...</p>
        </div>
      }>
        <ImpactTwinView
          initialForecastId={activeForecastId}
          initialScenario={resolvedScenario}
          initialCity={resolvedCity}
        />
      </Suspense>
    </div>
  );
}

