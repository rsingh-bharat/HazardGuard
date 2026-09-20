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
    <div
      className="p-4 flex flex-col justify-between select-none"
      style={{
        background: "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.05) 100%)",
        backdropFilter: "blur(26px) saturate(118%)",
        WebkitBackdropFilter: "blur(26px) saturate(118%)",
        border: "1px solid rgba(255,255,255,.15)",
        borderRadius: 16,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          style={{
            fontFamily: "'Inter Tight', Inter, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            color: '#ffffff',
            letterSpacing: '-0.2px',
          }}
        >
          {label}
        </span>
        <div
          className="flex items-center gap-1"
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: isPositiveGain ? 'rgba(200,255,61,.14)' : 'rgba(255,59,48,.14)',
            border: isPositiveGain ? '1px solid rgba(200,255,61,.35)' : '1px solid rgba(255,59,48,.35)',
            color: isPositiveGain ? '#C8FF3D' : '#FF3B30',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {isReductionBetter ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
          {isReductionBetter ? `-${improvementPct.toFixed(1)}%` : `+${improvementPct.toFixed(1)}%`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto pt-3" style={{ borderTop: "1px solid rgba(255,255,255,.12)" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,.50)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
            RAW NWP
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span
              style={{
                fontFamily: "'Inter Tight', Inter, sans-serif",
                fontWeight: 500,
                fontSize: 18,
                color: "rgba(255,255,255,.40)",
                textDecoration: "line-through",
              }}
            >
              {rawValue.toFixed(2)}
            </span>
            {unit && <span style={{ color: "rgba(255,255,255,.40)", fontSize: 11 }}>{unit}</span>}
          </div>
        </div>

        <div className="text-right">
          <p style={{ color: "#C8FF3D", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
            AI CORRECTED
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, justifyContent: 'flex-end' }}>
            <span
              style={{
                fontFamily: "'Inter Tight', Inter, sans-serif",
                fontWeight: 600,
                fontSize: 24,
                color: "#ffffff",
                letterSpacing: "-0.5px",
                lineHeight: 1,
              }}
            >
              {correctedValue.toFixed(2)}
            </span>
            {unit && <span style={{ color: "rgba(255,255,255,.60)", fontSize: 12 }}>{unit}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
