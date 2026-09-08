'use client';

import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  label: string;
  unit: string;
  rawValue: number;
  correctedValue: number;
  improvementPct: number;
  isReductionBetter?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  unit,
  rawValue,
  correctedValue,
  improvementPct,
  isReductionBetter = true,
}) => {
  const isPositiveGain = isReductionBetter ? improvementPct > 0 : improvementPct > 0;

  return (
    <div className="p-3.5 bg-graphite-900 border border-graphite-700 shadow-sm flex flex-col justify-between select-none font-mono">
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-xs text-paper uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-extrabold ${
            isPositiveGain
              ? 'bg-chartreuse/20 text-chartreuse border border-chartreuse/40'
              : 'bg-signal-red/20 text-signal-red border border-signal-red/40'
          }`}
        >
          {isReductionBetter ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          {isReductionBetter ? `-${improvementPct.toFixed(1)}%` : `+${improvementPct.toFixed(1)}%`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-graphite-800">
        <div>
          <span className="text-[9px] text-smoke uppercase font-bold">RAW NWP</span>
          <div className="text-xs font-mono font-bold text-smoke line-through">
            {rawValue.toFixed(2)} {unit}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] text-chartreuse uppercase font-bold">AI CORRECTED</span>
          <div className="text-sm font-mono font-extrabold text-paper">
            {correctedValue.toFixed(2)} {unit}
          </div>
        </div>
      </div>
    </div>
  );
};
