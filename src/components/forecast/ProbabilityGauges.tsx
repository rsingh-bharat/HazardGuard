'use client';

import React from 'react';

interface ProbabilityGaugesProps {
  heavyRain: number;        // P(>64.5mm)
  veryHeavy: number;        // P(>115.5mm)
  extremelyHeavy: number;   // P(>204.5mm)
}

interface GaugeItemProps {
  label: string;
  threshold: string;
  probability: number;
  colorHex: string;
}

const GaugeItem: React.FC<GaugeItemProps> = ({ label, threshold, probability, colorHex }) => {
  const percentage = Math.round(probability * 100);
  const strokeDashoffset = 100 - percentage;

  return (
    <div className="flex flex-col items-center p-2.5 bg-graphite-900 border border-graphite-700 flex-1 select-none">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-graphite-800"
            strokeWidth="4"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            stroke={colorHex}
            strokeDasharray="100, 100"
            strokeDashoffset={strokeDashoffset}
            strokeWidth="4"
            strokeLinecap="butt"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className="absolute font-mono font-bold text-xs text-paper">{percentage}%</span>
      </div>
      <span className="font-display font-bold text-xs text-paper uppercase tracking-wider mt-1.5">{label}</span>
      <span className="font-mono text-[9px] text-smoke">{threshold}</span>
    </div>
  );
};

export const ProbabilityGauges: React.FC<ProbabilityGaugesProps> = ({
  heavyRain,
  veryHeavy,
  extremelyHeavy,
}) => {
  return (
    <div className="space-y-1.5 font-mono">
      <div className="flex items-center justify-between text-xs font-bold text-paper-dim">
        <span className="font-display text-xs tracking-wider uppercase text-paper">
          EXCEEDANCE PROBABILITY (P &gt; THRESHOLD)
        </span>
        <span className="text-[9px] text-smoke">RAW ENSEMBLE</span>
      </div>
      <div className="flex items-center gap-2">
        <GaugeItem
          label="HEAVY RAIN"
          threshold="> 64.5 mm"
          probability={heavyRain}
          colorHex="#FFD166"
        />
        <GaugeItem
          label="VERY HEAVY"
          threshold="> 115.5 mm"
          probability={veryHeavy}
          colorHex="#FFB347"
        />
        <GaugeItem
          label="EXTREME RAIN"
          threshold="> 204.5 mm"
          probability={extremelyHeavy}
          colorHex="#FF3B30"
        />
      </div>
    </div>
  );
};
