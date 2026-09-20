import React, { Suspense } from 'react';
import ForecastPageClient from './_ForecastPageClient';

export default function ForecastPage() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-[calc(100vh-56px)] items-center justify-center ">
        <div className="text-smoke font-mono text-[11px] uppercase tracking-widest">Loadingâ€¦</div>
      </div>
    }>
      <ForecastPageClient />
    </Suspense>
  );
}

