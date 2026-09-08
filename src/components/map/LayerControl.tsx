'use client';

import React, { useState } from 'react';
import { LayerId } from '@/lib/layers/layerRegistry';
import { Layers, Cloud, ShieldAlert, CloudRain, Wind, Flame, Activity, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useShareableState } from '@/lib/state/useShareableState';

interface LayerControlProps {
  activeLayers: LayerId[];
  onToggleLayer: (layerId: LayerId) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({ activeLayers, onToggleLayer }) => {
  const [activeTier1, setActiveTier1] = useState<'hazard' | 'weather'>('hazard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { showAnimation, updateState } = useShareableState();

  const isLayerActive = (id: LayerId) => activeLayers.includes(id);

  const Toggle = ({ checked, onChange, accent = 'chartreuse' }: { checked: boolean; onChange: () => void; accent?: string }) => (
    <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div className={`w-7 h-3.5 bg-graphite-800 border border-graphite-600 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-paper after:rounded-none after:h-3 after:w-3 after:transition-all ${
        accent === 'signal-red' ? 'peer-checked:bg-signal-red' :
        accent === 'amber' ? 'peer-checked:bg-amber' :
        accent === 'violet' ? 'peer-checked:bg-violet' :
        'peer-checked:bg-chartreuse'
      }`} />
    </label>
  );

  return (
    <div className="absolute bottom-6 left-6 z-30 flex flex-col bg-graphite-900/95 backdrop-blur-md border border-graphite-700 shadow-2xl w-72 overflow-hidden transition-all duration-150 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-graphite-950 border-b border-graphite-700">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-chartreuse" />
          <span className="text-[11px] font-mono font-bold text-paper tracking-wider uppercase">
            LAYER ARRAY // MATRIX
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-smoke hover:text-paper hover:bg-graphite-800 transition"
          title={isCollapsed ? 'Expand Layer Matrix' : 'Collapse Layer Matrix'}
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3 space-y-3 font-mono">
          {/* Satellite Cloud Radar toggle */}
          <div className="flex items-center justify-between p-2 bg-graphite-950 border border-graphite-700">
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-violet" />
              <span className="text-[11px] font-bold text-paper">SATELLITE CLOUD RADAR</span>
            </div>
            <Toggle
              checked={isLayerActive('rainviewerCloud')}
              onChange={() => onToggleLayer('rainviewerCloud')}
              accent="violet"
            />
          </div>

          {/* Show Animation toggle */}
          <div className="flex items-center justify-between p-2 bg-graphite-950 border border-chartreuse/30">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-chartreuse" />
              <div>
                <span className="text-[11px] font-bold text-chartreuse">SHOW ANIMATION</span>
                <div className="text-[9px] text-smoke">Rain & wind vectors on alert zones</div>
              </div>
            </div>
            <Toggle
              checked={!!showAnimation}
              onChange={() => updateState({ showAnimation: !showAnimation })}
              accent="chartreuse"
            />
          </div>

          {/* Tier 1 Switcher */}
          <div className="grid grid-cols-2 p-0.5 bg-graphite-950 border border-graphite-700 gap-1 text-[11px]">
            <button
              onClick={() => setActiveTier1('hazard')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 font-bold transition-all duration-150 ${
                activeTier1 === 'hazard'
                  ? 'bg-graphite-800 text-signal-red border-b border-signal-red shadow-[0_1px_4px_rgba(255,59,48,0.2)]'
                  : 'text-smoke hover:text-paper hover:bg-graphite-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              HAZARD MAP
            </button>
            <button
              onClick={() => setActiveTier1('weather')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 font-bold transition-all duration-150 ${
                activeTier1 === 'weather'
                  ? 'bg-graphite-800 text-chartreuse border-b border-chartreuse shadow-[0_1px_4px_rgba(200,255,61,0.2)]'
                  : 'text-smoke hover:text-paper hover:bg-graphite-900'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              WEATHER MAP
            </button>
          </div>

          {/* Tier 2 Layers */}
          <div className="space-y-1 text-xs">
            {activeTier1 === 'hazard' ? (
              <>
                {/* Rain Alert */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-3.5 h-3.5 text-signal-red" />
                    <div>
                      <span className="text-[11px]">Rain Alert</span>
                      {showAnimation && isLayerActive('rainfall') && (
                        <div className="text-[9px] text-chartreuse">▶ rain animation active</div>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('rainfall')}
                    onChange={() => onToggleLayer('rainfall')}
                    className="accent-signal-red rounded-none cursor-pointer"
                  />
                </label>

                {/* Flood */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-amber" />
                    <span className="text-[11px]">Flood</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('waterRisk')}
                    onChange={() => onToggleLayer('waterRisk')}
                    className="accent-amber rounded-none cursor-pointer"
                  />
                </label>

                {/* Earthquake */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-violet" />
                    <span className="text-[11px]">Earthquake</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('earthquake')}
                    onChange={() => onToggleLayer('earthquake')}
                    className="accent-violet rounded-none cursor-pointer"
                  />
                </label>

                {/* Wildfire */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-amber" />
                    <span className="text-[11px]">Wildfire</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('wildfire')}
                    onChange={() => onToggleLayer('wildfire')}
                    className="accent-amber rounded-none cursor-pointer"
                  />
                </label>
              </>
            ) : (
              <>
                {/* Wind */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <Wind className="w-3.5 h-3.5 text-chartreuse" />
                    <div>
                      <span className="text-[11px]">Wind</span>
                      {showAnimation && isLayerActive('windStreamlines') && (
                        <div className="text-[9px] text-chartreuse">▶ streamline animation active</div>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('windStreamlines')}
                    onChange={() => onToggleLayer('windStreamlines')}
                    className="accent-chartreuse rounded-none cursor-pointer"
                  />
                </label>

                {/* Heavy Rain Probability */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-3.5 h-3.5 text-amber" />
                    <span className="text-[11px]">Heavy Rain Probability</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('heavyRainProbability')}
                    onChange={() => onToggleLayer('heavyRainProbability')}
                    className="accent-amber rounded-none cursor-pointer"
                  />
                </label>

                {/* Weather Regime Boundaries */}
                <label className="flex items-center justify-between px-2 py-1.5 hover:bg-graphite-800 cursor-pointer text-paper-dim border border-transparent hover:border-graphite-700">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-violet" />
                    <span className="text-[11px]">Weather Regime Boundaries</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isLayerActive('weatherRegime')}
                    onChange={() => onToggleLayer('weatherRegime')}
                    className="accent-violet rounded-none cursor-pointer"
                  />
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
