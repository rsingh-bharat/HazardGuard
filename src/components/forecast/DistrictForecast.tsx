'use client';

import React from 'react';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { ProbabilityGauges } from './ProbabilityGauges';
import { UncertaintyBar } from './UncertaintyBar';
import { ArrowRight, Cpu, FileText, ArrowLeft, Droplets, Waves, AlertOctagon, Target } from 'lucide-react';
import Link from 'next/link';
import { getRegimeDisplayName } from '@/lib/utils';

interface DistrictForecastProps {
  district: ForecastSnapshot;
  onBack: () => void;
  onOpenReport?: () => void;
  onOpenMeghDoot?: () => void;
}

export const DistrictForecast: React.FC<DistrictForecastProps> = ({
  district,
  onBack,
  onOpenReport,
  onOpenMeghDoot,
}) => {
  const { geography, rainfall, regime, probability, riversAtRisk } = district;

  const alertBannerClass =
    rainfall.alertLevel === 'RED'
      ? 'bg-signal-red text-graphite-950 font-bold'
      : rainfall.alertLevel === 'ORANGE'
      ? 'bg-amber text-graphite-950 font-bold'
      : rainfall.alertLevel === 'YELLOW'
      ? 'bg-amber-300 text-graphite-950 font-bold'
      : 'bg-chartreuse text-graphite-950 font-bold';

  return (
    <div className="space-y-4 text-xs select-none font-mono">
      {/* Header & Back Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] font-bold text-smoke hover:text-paper transition py-1 px-2 bg-graphite-900 border border-graphite-700 hover:bg-graphite-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO NATIONAL MATRIX</span>
        </button>

        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-graphite-900 text-chartreuse border border-graphite-700">
          LOC // {geography.districtId}
        </span>
      </div>

      {/* District Title & Alert Bar */}
      <div className="bg-graphite-900 border border-graphite-700 shadow-xl overflow-hidden">
        <div className={`px-4 py-2 flex items-center justify-between tracking-wider text-xs uppercase ${alertBannerClass}`}>
          <div className="flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4" />
            <span className="font-display font-bold text-sm">{rainfall.alertLevel} ALERT IN EFFECT</span>
          </div>
          <span className="font-mono text-xs">{rainfall.correctedMm.toFixed(1)} MM</span>
        </div>

        <div className="p-4 bg-graphite-950 space-y-3">
          <div className="flex items-baseline justify-between border-b border-graphite-800 pb-2.5">
            <div>
              <h2 className="font-display font-bold text-2xl text-paper tracking-wider uppercase">
                {geography.districtName}
              </h2>
              <span className="text-[11px] text-smoke font-mono">
                STATE: {geography.stateName.toUpperCase()} · COORD: {geography.lat.toFixed(2)}°N, {geography.lon.toFixed(2)}°E
              </span>
            </div>

            <div className="px-2 py-1 bg-graphite-900 border border-chartreuse/40 text-chartreuse font-bold text-[10px] tracking-wider">
              T+{district.leadHours}H WINDOW
            </div>
          </div>

          {/* Raw NWP vs AI-Corrected Comparison */}
          <div className="p-3 bg-graphite-900 border border-graphite-700 flex items-center justify-between">
            <div>
              <span className="text-[9px] text-smoke uppercase tracking-wider font-bold">RAW IMD/GFS NWP</span>
              <div className="text-sm font-mono font-bold text-smoke line-through">
                {rainfall.rawNwpMm !== null ? `${rainfall.rawNwpMm.toFixed(1)} mm` : 'DATA_UNAVAILABLE'}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <ArrowRight className="w-4 h-4 text-violet animate-pulse" />
              <span className="text-[8px] text-violet font-bold uppercase tracking-widest mt-0.5">
                REGIME-AWARE QDM
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-chartreuse uppercase font-bold tracking-wider">AI CORRECTED PRECIP</span>
              <div className="text-lg font-mono font-extrabold text-paper">
                {rainfall.correctedMm.toFixed(1)} mm
              </div>
            </div>
          </div>

          {/* Regime Classification Badge */}
          <div className="p-3 bg-graphite-900/90 border border-violet/40 flex items-start gap-2.5">
            <Droplets className="w-4 h-4 text-violet shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-xs text-paper uppercase tracking-wider">
                  REGIME: {getRegimeDisplayName(regime.label).toUpperCase()}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-violet-deep text-violet border border-violet/40 font-bold">
                  {(regime.confidence * 100).toFixed(0)}% SYNC
                </span>
              </div>
              <p className="font-sans text-[11px] text-paper-dim mt-1 leading-relaxed">
                {regime.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Exceedance Probability Gauges */}
      <ProbabilityGauges
        heavyRain={probability.heavyRain_64mm}
        veryHeavy={probability.veryHeavy_115mm}
        extremelyHeavy={probability.extremelyHeavy_204mm}
      />

      {/* Uncertainty Bounds Bar */}
      <UncertaintyBar p10={rainfall.p10Mm} p50={rainfall.p50Mm} p90={rainfall.p90Mm} />

      {/* Rivers at Risk */}
      {riversAtRisk.length > 0 && (
        <div className="p-3 bg-graphite-900 border border-graphite-700 space-y-2">
          <div className="flex items-center gap-1.5 font-display font-bold text-paper text-xs uppercase tracking-wider">
            <Waves className="w-3.5 h-3.5 text-chartreuse" />
            <span>RIVER DRAINAGE BASINS AT RISK</span>
          </div>
          <div className="space-y-1.5">
            {riversAtRisk.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-graphite-950 border border-graphite-800 text-[11px]"
              >
                <div>
                  <span className="font-bold text-paper">{r.riverName.toUpperCase()}</span>
                  <span className="text-smoke ml-1.5 font-mono">({r.basin})</span>
                </div>
                <span
                  className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 tracking-wider ${
                    r.dangerLevel === 'SEVERE'
                      ? 'bg-signal-red text-graphite-950'
                      : r.dangerLevel === 'DANGER'
                      ? 'bg-amber text-graphite-950'
                      : 'bg-amber-300 text-graphite-950'
                  }`}
                >
                  {r.dangerLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Link
          href={`/impact?districtId=${geography.districtId}&forecastId=${district.forecastId}&scenario=P50`}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-chartreuse hover:bg-chartreuse/90 text-graphite-950 font-mono font-bold text-xs tracking-wider uppercase transition shadow-md shadow-chartreuse/20 text-center"
        >
          <Cpu className="w-3.5 h-3.5" />
          SIMULATE 3D IMPACT
        </Link>

        <Link
          href={`/reports?stateId=${geography.stateId}&districtId=${geography.districtId}`}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-graphite-900 hover:bg-graphite-800 text-paper font-mono font-bold text-xs border border-graphite-700 tracking-wider uppercase transition text-center"
        >
          <FileText className="w-3.5 h-3.5" />
          OFFICIAL BULLETIN
        </Link>
      </div>
    </div>
  );
};
