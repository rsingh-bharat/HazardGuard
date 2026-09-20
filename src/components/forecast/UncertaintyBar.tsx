'use client';

import React from 'react';

interface UncertaintyBarProps {
  p10: number | null;
  p50: number | null;
  p90: number | null;
}

export const UncertaintyBar: React.FC<UncertaintyBarProps> = ({ p10, p50, p90 }) => {
  const isUnavailable = p10 == null || p50 == null || p90 == null || (p10 === p50 && p50 === p90);

  if (isUnavailable) {
    return (
      <div className="space-y-2 p-3  border border-white/15 select-none font-mono">
        <div className="flex items-center justify-between text-xs text-white">
          <span className="font-tight font-bold text-xs tracking-wider uppercase text-white/50">
            RAW ENSEMBLE UNCERTAINTY
          </span>
          <span className="text-[9px] px-1.5 py-0.5  border border-white/10 text-white/50 font-bold">
            UNAVAILABLE
          </span>
        </div>
        <div className="p-2 /80 border border-white/10 text-[10px] text-white/50 leading-relaxed">
          Statistical ensemble percentiles are unavailable for this provider run. Cumulative quantiles cannot be synthesized from hourly statistics or single-value NWP.
          {typeof p50 === 'number' && (
            <div className="mt-1 text-white/70">
              Deterministic forecast: <strong className="text-chartreuse font-bold">{p50.toFixed(1)} mm</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  const maxRain = Math.max(250, p90! * 1.15);
  const p10Pct = (p10! / maxRain) * 100;
  const p50Pct = (p50! / maxRain) * 100;
  const p90Pct = (p90! / maxRain) * 100;

  return (
    <div className="space-y-2 p-3  border border-white/15 select-none font-mono">
      <div className="flex items-center justify-between text-xs text-white">
        <span className="font-tight font-bold text-xs tracking-wider uppercase">
          RAW ENSEMBLE QUANTILES (P10 · P50 · P90)
        </span>
        <span className="text-[9px] text-white/50">RAW ENSEMBLE</span>
      </div>

      <div className="relative h-3.5  rounded-none overflow-hidden mt-2 border border-white/15">
        {/* P10 to P90 Range Fill with Violet tint */}
        <div
          className="absolute top-0 bottom-0 bg-violet/25 border-x border-violet"
          style={{ left: `${p10Pct}%`, width: `${p90Pct - p10Pct}%` }}
        />
        {/* P50 Median Marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-chartreuse shadow-[0_0_8px_rgba(200,255,61,0.8)] transform -translate-x-1/2"
          style={{ left: `${p50Pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/70 pt-1 border-t border-white/10">
        <div>
          <span className="text-white/50">P10 (RAW LOW): </span>
          <b className="text-chartreuse font-bold">{p10.toFixed(1)} mm</b>
        </div>
        <div>
          <span className="text-white/50">P50 (RAW MEDIAN): </span>
          <b className="text-white font-bold">{p50.toFixed(1)} mm</b>
        </div>
        <div>
          <span className="text-white/50">P90 (RAW HIGH): </span>
          <b className="text-signal-red font-bold">{p90.toFixed(1)} mm</b>
        </div>
      </div>
    </div>
  );
};
