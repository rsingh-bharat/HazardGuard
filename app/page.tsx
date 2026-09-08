// Server component shell — wraps the client page in Suspense so
// useSearchParams() doesn't fail during static prerendering.
import React, { Suspense } from 'react';
import HomePageClient from './_HomePageClient';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-[calc(100vh-56px)] items-center justify-center bg-graphite-950">
        <div className="text-smoke font-mono text-[11px] uppercase tracking-widest">Loading…</div>
      </div>
    }>
      <HomePageClient />
    </Suspense>
  );
}
