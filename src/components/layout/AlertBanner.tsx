'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const AlertBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-signal-red text-graphite-950 px-4 py-1.5 flex items-center justify-between text-xs shadow-lg font-mono select-none">
      <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-graphite-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-graphite-950"></span>
        </span>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-graphite-950" />
        <span className="font-display font-bold text-sm tracking-wider uppercase">
          PRIORITY ESCALATION // RED ALERT ACTIVE:
        </span>
        <span className="truncate text-graphite-900 font-medium">
          Extremely heavy precipitation (&gt;204.5 mm) detected across <b>Puri (OR), Wayanad (KL), Cachar (AS), Valsad (GJ)</b>.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <Link
          href="/forecast"
          className="flex items-center gap-1 font-bold text-graphite-950 hover:underline uppercase text-[11px] tracking-wider"
        >
          <span>OPERATIONAL TELEMETRY</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-0.5 hover:bg-graphite-950/20 transition text-graphite-950"
          title="Acknowledge & Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
