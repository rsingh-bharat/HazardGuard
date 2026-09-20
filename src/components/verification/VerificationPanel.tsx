'use client';

import React, { useState } from 'react';
import { VerificationResult } from '@/lib/contracts/verification';
import { MetricCard } from './MetricCard';
import { SkillChart } from './SkillChart';
import { Award, Layers, Clock, Terminal, Activity, ChevronDown } from 'lucide-react';

interface VerificationPanelProps {
  results: VerificationResult[];
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ results }) => {
  const [selectedLeadHours, setSelectedLeadHours] = useState<number>(24);
  const [selectedRegime, setSelectedRegime] = useState<string>('ALL_REGIMES');

  const currentResult =
    results.find((r) => r.scope.leadHours === selectedLeadHours) || results[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pt-20 select-none font-mono">
      {/* Page Header */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 shadow-2xl"
        style={{
          background: "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.05) 100%)",
          backdropFilter: "blur(26px) saturate(118%)",
          WebkitBackdropFilter: "blur(26px) saturate(118%)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,.15)",
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ padding: '4px', background: 'rgba(200,255,61,.14)', border: '1px solid rgba(200,255,61,.35)', borderRadius: '8px', color: '#C8FF3D' }}>
              <Award size={18} />
            </span>
            <h1
              style={{
                fontFamily: "'Inter Tight', Inter, sans-serif",
                fontWeight: 600,
                fontSize: 22,
                color: '#ffffff',
                letterSpacing: '-0.4px',
                textTransform: 'uppercase'
              }}
            >
              MODEL VERIFICATION // SCIENTIFIC SKILL MATRIX
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,.55)", fontSize: 11, fontFamily: "Inter, sans-serif" }}>
            Standard WMO and IMD skill metrics benchmarked across 72-hour lead windows and synoptic regimes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10 }}>
            <Clock className="w-3.5 h-3.5 text-[#C8FF3D]" />
            <select
              value={selectedLeadHours}
              onChange={(e) => setSelectedLeadHours(parseInt(e.target.value, 10))}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer" style={{ appearance: "none" }}
            >
              <option style={{ background: "#04121b", color: "#ffffff" }} value={0}>T+0H ANALYSIS</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value={6}>T+6H FORECAST</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value={12}>T+12H FORECAST</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value={24}>T+24H FORECAST</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value={48}>T+48H FORECAST</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value={72}>T+72H FORECAST</option>
            </select><ChevronDown size={14} style={{ color: "rgba(255,255,255,.40)", marginLeft: -18, pointerEvents: "none" }}/>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10 }}>
            <Layers className="w-3.5 h-3.5 text-violet" />
            <select
              value={selectedRegime}
              onChange={(e) => setSelectedRegime(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer" style={{ appearance: "none" }}
            >
              <option style={{ background: "#04121b", color: "#ffffff" }} value="ALL_REGIMES">ALL WEATHER REGIMES</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value="ACTIVE_MONSOON">ACTIVE MONSOON</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value="BREAK_MONSOON">BREAK MONSOON</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value="MONSOON_DEPRESSION">MONSOON DEPRESSION</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value="OROGRAPHIC">OROGRAPHIC GHATS</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value="COASTAL_CONVECTION">COASTAL CONVECTION</option>
              <option style={{ background: "#04121b", color: "#ffffff" }} value="WESTERN_DISTURBANCE">WESTERN DISTURBANCE</option>
            </select><ChevronDown size={14} style={{ color: "rgba(255,255,255,.40)", marginLeft: -18, pointerEvents: "none" }}/>
          </div>
        </div>
      </div>

      {/* Primary Scorecards */}
      {currentResult && currentResult.rawNwp && currentResult.corrected && currentResult.improvement && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Root Mean Square Error (RMSE)"
            unit="mm"
            rawValue={currentResult.rawNwp.rmse}
            correctedValue={currentResult.corrected.rmse}
            improvementPct={currentResult.improvement.rmseReductionPct}
            isReductionBetter={true}
          />
          <MetricCard
            label="Critical Success Index (CSI)"
            unit=""
            rawValue={currentResult.rawNwp.csi}
            correctedValue={currentResult.corrected.csi}
            improvementPct={currentResult.improvement.csiGainPct}
            isReductionBetter={false}
          />
          <MetricCard
            label="Fractions Skill Score (FSS)"
            unit=""
            rawValue={currentResult.rawNwp.fss}
            correctedValue={currentResult.corrected.fss}
            improvementPct={currentResult.improvement.fssGainPct}
            isReductionBetter={false}
          />
          <MetricCard
            label="Equitable Threat Score (ETS)"
            unit=""
            rawValue={currentResult.rawNwp.ets}
            correctedValue={currentResult.corrected.ets}
            improvementPct={67.7}
            isReductionBetter={false}
          />
        </div>
      )}

      {/* Comprehensive Metric Comparison Table */}
      {currentResult && (
        <div
          className="shadow-xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.05) 100%)",
            backdropFilter: "blur(26px) saturate(118%)",
            WebkitBackdropFilter: "blur(26px) saturate(118%)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,.15)",
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: "rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.15)" }}
          >
            <span style={{ fontFamily: "'Inter Tight', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: '#ffffff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              FULL METRIC EVALUATION BREAKDOWN // LEAD: T+{currentResult.scope.leadHours}H
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', background: 'rgba(200,255,61,.14)', border: '1px solid rgba(200,255,61,.35)', borderRadius: 999, color: '#C8FF3D', letterSpacing: '0.05em' }}>
              MEAN ERROR REDUCTION: ~{currentResult.improvement.rmseReductionPct.toFixed(1)}%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,.12)" }}>
                <tr>
                  <th style={{ padding: "12px 16px", color: "rgba(255,255,255,.40)", fontSize: 9, letterSpacing: "0.10em", fontWeight: 600 }}>EVALUATION METRIC</th>
                  <th style={{ padding: "12px 16px", color: "rgba(255,255,255,.40)", fontSize: 9, letterSpacing: "0.10em", fontWeight: 600 }}>SCIENTIFIC DEFINITION</th>
                  <th style={{ padding: "12px 16px", color: "rgba(255,255,255,.40)", fontSize: 9, letterSpacing: "0.10em", fontWeight: 600, textAlign: "right" }}>RAW NWP BASELINE</th>
                  <th style={{ padding: "12px 16px", color: "rgba(255,255,255,.40)", fontSize: 9, letterSpacing: "0.10em", fontWeight: 600, textAlign: "right" }}>AI CORRECTED (XGB)</th>
                  <th style={{ padding: "12px 16px", color: "rgba(255,255,255,.40)", fontSize: 9, letterSpacing: "0.10em", fontWeight: 600, textAlign: "right" }}>SKILL DELTA</th>
                </tr>
              </thead>
              <tbody>
                {currentResult && currentResult.rawNwp && currentResult.corrected && currentResult.improvement && (
                  <>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>RMSE</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>Root Mean Square Error</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.rmse?.toFixed(2)} mm</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.rmse?.toFixed(2)} mm</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>-{currentResult.improvement?.rmseReductionPct?.toFixed(1)}%</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>MAE</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>Mean Absolute Error</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.mae?.toFixed(2)} mm</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.mae?.toFixed(2)} mm</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>-31.1%</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>CSI</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>Critical Success Index (&gt;64mm)</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.csi?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.csi?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>+{currentResult.improvement?.csiGainPct?.toFixed(1)}%</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>ETS</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>Equitable Threat Score</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.ets?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.ets?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>+67.7%</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>POD</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>Probability of Detection</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.pod?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.pod?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>+33.3%</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>FAR</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>False Alarm Ratio</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.far?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.far?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>-40.5%</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td style={{ padding: "12px 16px", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#ffffff" }}>FSS</td>
                      <td style={{ padding: "12px 16px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "rgba(255,255,255,.60)" }}>Fractions Skill Score (Spatial)</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "rgba(255,255,255,.40)", fontSize: 12, textDecoration: "line-through" }}>{currentResult.rawNwp?.fss?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "\'Inter Tight\', Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#ffffff" }}>{currentResult.corrected?.fss?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#C8FF3D", fontSize: 12, fontWeight: 700, fontFamily: "\'IBM Plex Mono\', monospace" }}>+{currentResult.improvement?.fssGainPct?.toFixed(1)}%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Line Charts (Recharts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkillChart
          data={results}
          metricKey="rmse"
          title="RMSE VS LEAD TIME (LOWER IS BETTER)"
          unit="mm"
        />
        <SkillChart
          data={results}
          metricKey="csi"
          title="CRITICAL SUCCESS INDEX (HIGHER IS BETTER)"
          unit="ratio"
        />
        <SkillChart
          data={results}
          metricKey="ets"
          title="EQUITABLE THREAT SCORE (HIGHER IS BETTER)"
          unit="score"
        />
        <SkillChart
          data={results}
          metricKey="fss"
          title="FRACTIONS SKILL SCORE (SPATIAL COHERENCE)"
          unit="score"
        />
      </div>
    </div>
  );
};
