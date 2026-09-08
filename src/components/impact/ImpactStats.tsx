'use client';

import React from 'react';
import { ImpactResult } from '@/lib/contracts/impact';
import { Users, Building, Route, Hospital, GraduationCap, ShieldAlert } from 'lucide-react';

interface ImpactStatsProps {
  impact: ImpactResult | null;
}

export const ImpactStats: React.FC<ImpactStatsProps> = ({ impact }) => {
  if (!impact) {
    return (
      <div className="p-6 bg-graphite-900 border border-graphite-700 text-center text-smoke text-xs font-mono">
        // ENGAGE SIMULATION TO COMPUTE 3D ASSET EXPOSURE TELEMETRY //
      </div>
    );
  }

  const { exposure, severity, rainfallMm } = impact;

  const severityBadgeClass =
    severity.overall === 'CRITICAL'
      ? 'bg-signal-red text-graphite-950 font-bold'
      : severity.overall === 'HIGH'
      ? 'bg-amber text-graphite-950 font-bold'
      : severity.overall === 'WATCH'
      ? 'bg-amber-300 text-graphite-950 font-bold'
      : 'bg-chartreuse text-graphite-950 font-bold';

  return (
    <div className="p-4 bg-graphite-900 border border-graphite-700 shadow-xl space-y-4 select-none font-mono">
      {/* Severity Header */}
      <div className="flex items-center justify-between pb-3 border-b border-graphite-800">
        <div>
          <span className="text-[9px] text-smoke font-bold uppercase tracking-wider">ESTIMATED PHYSICAL IMPACT RATING</span>
          <div className="font-display font-bold text-lg text-paper mt-0.5 tracking-wider uppercase">
            {impact.districtId} HYDROLOGICAL EXPOSURE
          </div>
        </div>
        <div className={`px-2.5 py-1 text-xs uppercase tracking-wider font-mono ${severityBadgeClass}`}>
          {severity.overall} RISK
        </div>
      </div>

      {/* Population & Main Metrics */}
      <div className="p-3 bg-graphite-950 border-l-4 border-signal-red flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-signal-red/20 text-signal-red border border-signal-red/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] text-signal-red font-bold uppercase tracking-wider">EXPOSED CITIZEN POPULATION</span>
            <div className="font-display text-xl font-bold text-paper tracking-wider">
              {exposure.populationExposed !== null && exposure.populationExposed !== undefined ? `${exposure.populationExposed.toLocaleString()} CITIZENS` : 'DATA UNAVAILABLE'}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-smoke bg-graphite-900 border border-graphite-700 px-2 py-0.5">
          {rainfallMm.toFixed(1)} mm load
        </span>
      </div>

      {/* Infrastructure Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-graphite-950 border border-graphite-800 flex items-center gap-2">
          <Route className="w-4 h-4 text-chartreuse shrink-0" />
          <div>
            <span className="text-[9px] text-smoke uppercase">SUBMERGED ROADS</span>
            <div className="font-mono font-bold text-paper">{exposure.roadsKm !== null && exposure.roadsKm !== undefined ? `${exposure.roadsKm} KM` : 'N/A'}</div>
          </div>
        </div>

        <div className="p-2.5 bg-graphite-950 border border-graphite-800 flex items-center gap-2">
          <Building className="w-4 h-4 text-violet shrink-0" />
          <div>
            <span className="text-[9px] text-smoke uppercase">BUILDINGS INUNDATED</span>
            <div className="font-mono font-bold text-paper">{exposure.buildingsCount !== null && exposure.buildingsCount !== undefined ? exposure.buildingsCount.toLocaleString() : 'N/A'}</div>
          </div>
        </div>

        <div className="p-2.5 bg-graphite-950 border border-graphite-800 flex items-center gap-2">
          <Hospital className="w-4 h-4 text-signal-red shrink-0" />
          <div>
            <span className="text-[9px] text-signal-red uppercase font-bold">CRITICAL HOSPITALS</span>
            <div className="font-mono font-bold text-signal-red">{exposure.hospitalsAtRisk !== null && exposure.hospitalsAtRisk !== undefined ? `${exposure.hospitalsAtRisk} AT RISK` : 'N/A'}</div>
          </div>
        </div>

        <div className="p-2.5 bg-graphite-950 border border-graphite-800 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-amber shrink-0" />
          <div>
            <span className="text-[9px] text-smoke uppercase">RELIEF SHELTERS</span>
            <div className="font-mono font-bold text-paper">{exposure.schoolsAtRisk !== null && exposure.schoolsAtRisk !== undefined ? `${exposure.schoolsAtRisk} LOCATIONS` : 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
