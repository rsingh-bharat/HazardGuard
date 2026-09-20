'use client';

import React from 'react';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { ArrowLeft, AlertTriangle, Droplets, Waves, Cpu, FileText } from 'lucide-react';
import Link from 'next/link';
import { getRegimeDisplayName } from '@/lib/utils';

// --- Alert colour helper ---
function alertColor(level: string) {
  switch (level) {
    case 'RED':
      return { bg: 'rgba(255,59,48,.22)', border: 'rgba(255,59,48,.50)', text: '#FF3B30' };
    case 'ORANGE':
      return { bg: 'rgba(255,179,71,.18)', border: 'rgba(255,179,71,.45)', text: '#FFB347' };
    case 'YELLOW':
      return { bg: 'rgba(255,214,10,.15)', border: 'rgba(255,214,10,.40)', text: '#FFD60A' };
    default:
      return { bg: 'rgba(200,255,61,.14)', border: 'rgba(200,255,61,.40)', text: '#C8FF3D' };
  }
}

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
  const ac = alertColor(rainfall.alertLevel);

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 transition hover:brightness-125"
          style={{
            padding: '4px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.15)',
            color: 'rgba(255,255,255,.7)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={12} />
          <span>RETURN TO LIST</span>
        </button>
        <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 10, fontFamily: 'monospace' }}>
          ID: {geography.districtId}
        </span>
      </div>

      {/* Alert banner */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: ac.bg,
          border: `1px solid ${ac.border}`,
          borderRadius: 14,
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: ac.text }} />
          <span style={{ color: ac.text, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
            {rainfall.alertLevel} ALERT IN EFFECT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: ac.text, fontSize: 12, fontWeight: 700 }}>
            {rainfall.correctedMm.toFixed(1)} mm
          </span>
        </div>
      </div>

      <div className="px-2 space-y-4">
        {/* District name + coords */}
        <div>
          <h2
            style={{
              fontFamily: "'Inter Tight', Inter, sans-serif",
              fontWeight: 600,
              fontSize: 28,
              color: '#ffffff',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            {geography.districtName}
          </h2>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 11 }}>
            {geography.stateName.toUpperCase()} • {geography.lat.toFixed(2)}°N {geography.lon.toFixed(2)}°E • T+{district.leadHours}H
          </p>
        </div>

        {/* Big rainfall number */}
        <div
          className="flex items-end justify-between py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,.12)', borderBottom: '1px solid rgba(255,255,255,.12)' }}
        >
          <div>
            <p style={{ color: 'rgba(255,255,255,.50)', fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>
              AI CORRECTED – RAW ENSEMBLE
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span
                style={{
                  fontFamily: "'Inter Tight', Inter, sans-serif",
                  fontWeight: 500,
                  fontSize: 56,
                  color: '#ffffff',
                  letterSpacing: '-2px',
                  lineHeight: 1,
                }}
              >
                {rainfall.correctedMm.toFixed(1)}
              </span>
              <span style={{ color: 'rgba(255,255,255,.60)', fontSize: 20 }}>mm</span>
            </div>
            {rainfall.rawNwpMm !== null && (
              <p style={{ color: 'rgba(255,255,255,.40)', fontSize: 10, marginTop: 4 }}>
                Raw NWP: <span style={{ textDecoration: 'line-through' }}>{rainfall.rawNwpMm.toFixed(1)} mm</span>
              </p>
            )}
          </div>
          {/* P10/P50/P90 mini */}
          <div className="flex flex-col gap-1 text-right">
            {[
              { l: 'P10', v: rainfall.p10Mm },
              { l: 'P50', v: rainfall.p50Mm },
              { l: 'P90', v: rainfall.p90Mm },
            ].map(({ l, v }) => (
              <div key={l}>
                <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 600 }}>{(v ?? 0).toFixed(0)}mm</span>
                <span style={{ color: 'rgba(255,255,255,.40)', fontSize: 9, marginLeft: 4 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regime */}
        <div
          className="flex items-start gap-3 p-3"
          style={{ background: 'rgba(121,104,255,.12)', border: '1px solid rgba(121,104,255,.30)', borderRadius: 12 }}
        >
          <Droplets size={14} style={{ color: '#7968FF', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
                REGIME: {getRegimeDisplayName(regime.label).toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: '1px 6px',
                  background: 'rgba(121,104,255,.25)',
                  border: '1px solid rgba(121,104,255,.50)',
                  borderRadius: 999,
                  color: '#7968FF',
                  fontWeight: 700,
                }}
              >
                {(regime.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, lineHeight: 1.5 }}>
              {regime.description}
            </p>
          </div>
        </div>

        {/* Probability row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'HEAVY RAIN', val: probability.heavyRain_64mm, threshold: '>64mm' },
            { label: 'VERY HEAVY', val: probability.veryHeavy_115mm, threshold: '>115mm' },
            { label: 'EXTREME', val: probability.extremelyHeavy_204mm, threshold: '>204mm' },
          ].map(({ label, val, threshold }) => {
            const pct = Math.round(val * 100);
            const col = pct > 70 ? '#FF3B30' : pct > 40 ? '#FFB347' : '#C8FF3D';
            return (
              <div
                key={label}
                className="flex flex-col items-center p-2 gap-1"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 10 }}
              >
                <span style={{ color: col, fontSize: 18, fontWeight: 700 }}>{pct}%</span>
                <span style={{ color: 'rgba(255,255,255,.60)', fontSize: 9, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
                <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 8 }}>{threshold}</span>
              </div>
            );
          })}
        </div>

        {/* Rivers at risk */}
        {riversAtRisk.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 mt-4">
              <Waves size={12} style={{ color: '#C8FF3D' }} />
              <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Rivers at Risk
              </span>
            </div>
            <div className="space-y-1">
              {riversAtRisk.map((r, i) => {
                const rc = r.dangerLevel === 'SEVERE' ? '#FF3B30' : r.dangerLevel === 'DANGER' ? '#FFB347' : '#FFD60A';
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2"
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 8 }}
                  >
                    <div>
                      <span style={{ color: '#ffffff', fontSize: 11, fontWeight: 600 }}>{r.riverName}</span>
                      <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 10, marginLeft: 6 }}>{r.basin}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 7px',
                        background: `${rc}22`, border: `1px solid ${rc}55`,
                        borderRadius: 999, color: rc, letterSpacing: '0.05em',
                      }}
                    >
                      {r.dangerLevel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Link
            href={`/impact?districtId=${geography.districtId}&forecastId=${district.forecastId}&scenario=P50`}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 transition hover:brightness-110"
            style={{
              background: '#C8FF3D',
              color: '#04121b',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Cpu size={12} /> SIMULATE 3D
          </Link>
          <Link
            href={`/reports?stateId=${geography.stateId}&districtId=${geography.districtId}`}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 transition hover:brightness-110"
            style={{
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.20)',
              color: 'rgba(255,255,255,.85)',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <FileText size={12} /> BULLETIN
          </Link>
        </div>
      </div>
    </div>
  );
};
