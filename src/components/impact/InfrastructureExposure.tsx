'use client';

import React from 'react';
import { ImpactResult } from '@/lib/contracts/impact';
import { Shield, AlertTriangle } from 'lucide-react';

interface InfrastructureExposureProps {
  impact: ImpactResult | null;
}

export const InfrastructureExposure: React.FC<InfrastructureExposureProps> = ({ impact }) => {
  if (!impact) return null;

  return (
    <div className="p-4 bg-graphite-900 border border-graphite-700 shadow-xl space-y-3 select-none text-xs font-mono">
      <div className="flex items-center gap-2 font-display font-bold text-sm text-paper tracking-wider uppercase">
        <Shield className="w-4 h-4 text-chartreuse" />
        <span>CRITICAL ASSET CONTINGENCY DIRECTIVES</span>
      </div>

      <div className="p-4 flex flex-col items-center justify-center text-graphite-400 space-y-2 border border-dashed border-graphite-700 bg-graphite-950">
        <AlertTriangle className="w-6 h-6 text-amber" />
        <span className="font-bold tracking-widest text-amber">DATA_UNAVAILABLE</span>
        <span className="text-[10px] text-center">Specific infrastructure exposure data is not currently available for this region.</span>
      </div>
    </div>
  );
};
