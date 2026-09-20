'use client';

import React, { useState } from 'react';
import { LayerId } from '@/lib/layers/layerRegistry';
import { Layers, Cloud, ShieldAlert, CloudRain, Wind, Flame, Activity, Zap } from 'lucide-react';
import { useShareableState } from '@/lib/state/useShareableState';

interface LayerControlProps {
  activeLayers: LayerId[];
  onToggleLayer: (layerId: LayerId) => void;
  /** Bottom position offset (px) so the panel sits above the trigger button */
  bottomOffset?: number;
  /** Left position offset (px) */
  leftOffset?: number;
}

// ── Aurora toggle switch ─────────────────────────────────────────
function AuroraToggle({
  checked,
  onChange,
  accent = 'chartreuse',
}: {
  checked: boolean;
  onChange: () => void;
  accent?: 'chartreuse' | 'violet' | 'red' | 'amber';
}) {
  const trackColor = checked
    ? accent === 'chartreuse' ? 'rgba(200,255,61,.70)'
    : accent === 'violet'    ? 'rgba(121,104,255,.70)'
    : accent === 'red'       ? 'rgba(255,59,48,.70)'
    :                          'rgba(255,179,71,.70)'
    : 'rgba(255,255,255,.18)';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      role="switch"
      aria-checked={checked}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: trackColor,
        border: '1px solid rgba(255,255,255,.20)',
        position: 'relative',
        flexShrink: 0,
        cursor: 'pointer',
        transition: 'background 0.20s ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 17 : 2,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,.30)',
          transition: 'left 0.20s ease',
        }}
      />
    </button>
  );
}

// ── Aurora checkbox ──────────────────────────────────────────────
function AuroraCheckbox({
  checked,
  onChange,
  accent = 'chartreuse',
}: {
  checked: boolean;
  onChange: () => void;
  accent?: 'chartreuse' | 'violet' | 'red' | 'amber';
}) {
  const fillColor =
    accent === 'violet' ? '#7968FF'
    : accent === 'red'  ? '#FF3B30'
    : accent === 'amber'? '#FFB347'
    :                     '#C8FF3D';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: checked ? `1.5px solid ${fillColor}` : '1.5px solid rgba(255,255,255,.30)',
        background: checked ? `${fillColor}28` : 'rgba(255,255,255,.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke={fillColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export const LayerControl: React.FC<LayerControlProps> = ({
  activeLayers,
  onToggleLayer,
  bottomOffset = 60,
  leftOffset = 16,
}) => {
  const [activeTier1, setActiveTier1] = useState<'hazard' | 'weather'>('hazard');
  const { showAnimation, updateState } = useShareableState();

  const isLayerActive = (id: LayerId) => activeLayers.includes(id);

  return (
    <div
      className="absolute z-40 select-none"
      style={{
        bottom: bottomOffset,
        left: leftOffset,
        width: 280,
      }}
    >
      {/* Panel — opens above the trigger button */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(4,18,27,.94) 0%, rgba(8,22,34,.96) 100%)',
          backdropFilter: 'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
          border: '1px solid rgba(200,255,61,.25)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0,0,0,.55), 0 0 0 1px rgba(200,255,61,.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{
            background: 'rgba(200,255,61,.06)',
            borderBottom: '1px solid rgba(200,255,61,.15)',
          }}
        >
          <Layers size={13} style={{ color: '#C8FF3D' }} />
          <span
            style={{
              fontFamily: "'Inter Tight', Inter, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: '#C8FF3D',
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
            }}
          >
            Map Layers
          </span>
        </div>

        <div className="p-3 space-y-2">
          {/* Satellite Cloud Radar */}
          <div
            className="flex items-center justify-between px-3 py-2.5 transition hover:brightness-110"
            style={{
              background: 'rgba(121,104,255,.08)',
              border: '1px solid rgba(121,104,255,.18)',
              borderRadius: 10,
            }}
          >
            <div className="flex items-center gap-2">
              <Cloud size={13} style={{ color: '#a89fff' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#ffffff' }}>Satellite Cloud Radar</span>
            </div>
            <AuroraToggle
              checked={isLayerActive('rainviewerCloud')}
              onChange={() => onToggleLayer('rainviewerCloud')}
              accent="violet"
            />
          </div>

          {/* Show Animation */}
          <div
            className="flex items-center justify-between px-3 py-2.5 transition hover:brightness-110"
            style={{
              background: 'rgba(200,255,61,.08)',
              border: '1px solid rgba(200,255,61,.22)',
              borderRadius: 10,
            }}
          >
            <div className="flex items-center gap-2">
              <Zap size={13} style={{ color: '#C8FF3D' }} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#C8FF3D' }}>Animations</span>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', marginTop: 1 }}>Rain &amp; wind vectors</div>
              </div>
            </div>
            <AuroraToggle
              checked={!!showAnimation}
              onChange={() => updateState({ showAnimation: !showAnimation })}
              accent="chartreuse"
            />
          </div>

          {/* Tier 1 Switcher */}
          <div
            className="grid grid-cols-2 gap-1 p-1"
            style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10 }}
          >
            <button
              onClick={() => setActiveTier1('hazard')}
              className="flex items-center justify-center gap-1.5 py-1.5 transition"
              style={{
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: activeTier1 === 'hazard' ? 'rgba(255,59,48,.18)' : 'transparent',
                border: activeTier1 === 'hazard' ? '1px solid rgba(255,59,48,.40)' : '1px solid transparent',
                color: activeTier1 === 'hazard' ? '#FF3B30' : 'rgba(255,255,255,.45)',
                cursor: 'pointer',
              }}
            >
              <ShieldAlert size={11} />
              HAZARD
            </button>
            <button
              onClick={() => setActiveTier1('weather')}
              className="flex items-center justify-center gap-1.5 py-1.5 transition"
              style={{
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: activeTier1 === 'weather' ? 'rgba(200,255,61,.12)' : 'transparent',
                border: activeTier1 === 'weather' ? '1px solid rgba(200,255,61,.35)' : '1px solid transparent',
                color: activeTier1 === 'weather' ? '#C8FF3D' : 'rgba(255,255,255,.45)',
                cursor: 'pointer',
              }}
            >
              <CloudRain size={11} />
              WEATHER
            </button>
          </div>

          {/* Layer rows */}
          <div className="space-y-1 pt-1">
            {activeTier1 === 'hazard' ? (
              <>
                {[
                  { id: 'rainfall' as LayerId, icon: <CloudRain size={12} style={{ color: '#FF3B30' }} />, label: 'Rain Alert', accent: 'red' as const },
                  { id: 'waterRisk' as LayerId, icon: <Activity size={12} style={{ color: '#FFB347' }} />, label: 'Flood Risk', accent: 'amber' as const },
                  { id: 'earthquake' as LayerId, icon: <Activity size={12} style={{ color: '#a89fff' }} />, label: 'Earthquake', accent: 'violet' as const },
                  { id: 'wildfire' as LayerId, icon: <Flame size={12} style={{ color: '#FFB347' }} />, label: 'Wildfire', accent: 'amber' as const },
                ].map(({ id, icon, label, accent }) => (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer transition hover:bg-white/5"
                    style={{ borderRadius: 8 }}
                    onClick={() => onToggleLayer(id)}
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.80)' }}>{label}</span>
                    </div>
                    <AuroraCheckbox checked={isLayerActive(id)} onChange={() => onToggleLayer(id)} accent={accent} />
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { id: 'windStreamlines' as LayerId, icon: <Wind size={12} style={{ color: '#C8FF3D' }} />, label: 'Wind Streamlines', accent: 'chartreuse' as const },
                  { id: 'heavyRainProbability' as LayerId, icon: <CloudRain size={12} style={{ color: '#FFB347' }} />, label: 'Heavy Rain Probability', accent: 'amber' as const },
                  { id: 'weatherRegime' as LayerId, icon: <Layers size={12} style={{ color: '#a89fff' }} />, label: 'Weather Regime Zones', accent: 'violet' as const },
                ].map(({ id, icon, label, accent }) => (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer transition hover:bg-white/5"
                    style={{ borderRadius: 8 }}
                    onClick={() => onToggleLayer(id)}
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.80)' }}>{label}</span>
                    </div>
                    <AuroraCheckbox checked={isLayerActive(id)} onChange={() => onToggleLayer(id)} accent={accent} />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
