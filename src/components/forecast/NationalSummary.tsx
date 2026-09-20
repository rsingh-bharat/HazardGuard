'use client';

import React from 'react';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { ShieldAlert, AlertTriangle, ChevronRight, Activity, Radio } from 'lucide-react';
import { getRegimeDisplayName } from '@/lib/utils';

interface NationalSummaryProps {
  forecasts: ForecastSnapshot[];
  onSelectDistrict: (districtId: string) => void;
}

export const NationalSummary: React.FC<NationalSummaryProps> = ({ forecasts, onSelectDistrict }) => {
  const redList = forecasts.filter((f) => f.rainfall.alertLevel === 'RED');
  const orangeList = forecasts.filter((f) => f.rainfall.alertLevel === 'ORANGE');
  const yellowList = forecasts.filter((f) => f.rainfall.alertLevel === 'YELLOW');
  const greenList = forecasts.filter((f) => f.rainfall.alertLevel === 'GREEN');

  const top5 = [...forecasts]
    .sort((a, b) => b.rainfall.correctedMm - a.rainfall.correctedMm)
    .slice(0, 5);

  return (
    <div className="space-y-4 text-xs select-none font-mono">
      {/* Dominant Regime Overview Card */}
      <div className="p-3.5 border border-violet/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-violet/5 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-violet tracking-widest uppercase flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-violet animate-signal-blink" />
            SYNOPTIC WEATHER REGIME
          </span>
          <span className="text-[9px] px-2 py-0.5 bg-violet-deep text-violet border border-violet/40 font-bold">
            CONFIDENCE: 92%
          </span>
        </div>
        <div className="font-tight font-bold text-base text-white tracking-wider mt-1.5">
          MONSOON DEPRESSION & OROGRAPHIC JET
        </div>
        <p className="font-sans text-[11px] text-white/70 mt-1 leading-relaxed">
          Deep cyclonic depression over Northwest Bay of Bengal coupled with intense south-westerly orographic lifting across the Western Ghats crest.
        </p>
      </div>

      {/* National Alert Counts Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5  border-b-2 border-signal-red flex flex-col items-center shadow-sm">
          <span className="font-tight text-2xl font-bold text-signal-red tracking-tight">{redList.length}</span>
          <span className="text-[9px] font-bold text-signal-red uppercase tracking-wider mt-0.5">RED ALERT</span>
        </div>
        <div className="p-2.5  border-b-2 border-amber flex flex-col items-center shadow-sm">
          <span className="font-tight text-2xl font-bold text-amber tracking-tight">{orangeList.length}</span>
          <span className="text-[9px] font-bold text-amber uppercase tracking-wider mt-0.5">ORANGE</span>
        </div>
        <div className="p-2.5  border-b-2 border-amber-300 flex flex-col items-center shadow-sm">
          <span className="font-tight text-2xl font-bold text-amber-300 tracking-tight">{yellowList.length}</span>
          <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wider mt-0.5">YELLOW</span>
        </div>
        <div className="p-2.5  border-b-2 border-chartreuse flex flex-col items-center shadow-sm">
          <span className="font-tight text-2xl font-bold text-chartreuse tracking-tight">{greenList.length}</span>
          <span className="text-[9px] font-bold text-chartreuse uppercase tracking-wider mt-0.5">GREEN</span>
        </div>
      </div>

      {/* Top At-Risk Districts List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-white/70 font-bold px-1 border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-1.5 text-signal-red">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-tight text-xs tracking-wider uppercase">CRITICAL PRIORITY DISTRICTS // 24H</span>
          </div>
          <span className="text-[10px] text-white/50 font-normal">TARGET TO INSPECT</span>
        </div>

        <div className="space-y-1.5">
          {top5.map((d, i) => {
            const isRed = d.rainfall.alertLevel === 'RED';
            return (
              <div
                key={d.geography.districtId}
                onClick={() => onSelectDistrict(d.geography.districtId)}
                className={`flex items-center justify-between p-2.5  hover: border transition-all duration-150 cursor-pointer group shadow-sm ${
                  isRed ? 'border-signal-red/50 hover:border-signal-red' : 'border-white/15 hover:border-chartreuse/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 border border-white/15 flex items-center justify-center font-mono font-bold text-[10px] text-white/70">
                    0{i + 1}
                  </span>
                  <div>
                    <div className="font-tight font-bold text-sm tracking-wide text-white group-hover:text-chartreuse transition">
                      {d.geography.districtName.toUpperCase()}, {d.geography.stateName.toUpperCase()}
                    </div>
                    <div className="text-[9px] text-white/50 uppercase">
                      {getRegimeDisplayName(d.regime.label)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`font-mono font-bold text-xs ${isRed ? 'text-signal-red' : 'text-amber'}`}>
                      {d.rainfall.correctedMm.toFixed(1)} mm
                    </div>
                    <span
                      className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 tracking-wider ${
                        isRed
                          ? 'bg-signal-red text-graphite-950'
                          : 'bg-amber text-graphite-950'
                      }`}
                    >
                      {d.rainfall.alertLevel}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-2.5 /60 border border-white/10 text-center text-white/50 text-[10px] tracking-wider uppercase">
        <span>// CLICK ANY DISTRICT POLYGON ON THE MAP TO ENGAGE TELEMETRY //</span>
      </div>
    </div>
  );
};

