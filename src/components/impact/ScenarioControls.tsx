'use client';

import React from 'react';
import { ScenarioType } from '@/lib/contracts/impact';
import { SCENARIOS } from '@/lib/contracts/scenario';
import { Sliders, Play, CloudRain, Clock, Cpu } from 'lucide-react';

interface ScenarioControlsProps {
  selectedScenario: ScenarioType;
  rainfallMm: number;
  durationHours: number;
  isLoading: boolean;
  onScenarioChange: (scenario: ScenarioType) => void;
  onRainfallChange: (mm: number) => void;
  onDurationChange: (hours: number) => void;
  onRunSimulation: () => void;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  selectedScenario,
  rainfallMm,
  durationHours,
  isLoading,
  onScenarioChange,
  onRainfallChange,
  onDurationChange,
  onRunSimulation,
}) => {
  return (
    <div className="p-4  border border-white/15 shadow-xl space-y-4 select-none font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-chartreuse" />
          <h2 className="font-tight font-bold text-xs text-white tracking-wider uppercase">
            3D SCENARIO & RUNOFF CONTROLLER
          </h2>
        </div>
        <span className="text-[9px] px-2 py-0.5  text-white/50 border border-white/15 font-mono">
          SRTM 30M HYDRO DEM
        </span>
      </div>

      {/* Scenario Buttons (P10, P50, P90, Custom) */}
      <div className="grid grid-cols-2 gap-2">
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onScenarioChange(sc.id)}
              className={`p-2.5 border text-left transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? ' border-chartreuse text-white shadow-[inset_0_-2px_0_rgba(200,255,61,0.6)]'
                  : '/80 border-white/10 text-white/50 hover:text-white hover:'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-tight font-bold text-sm tracking-wider">{sc.id}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-chartreuse animate-radar-pulse" />}
              </div>
              <span className="text-[9px] font-mono text-white/50 mt-1 line-clamp-1">{sc.description}</span>
            </button>
          );
        })}
      </div>

      {/* Sliders */}
      <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
        <div>
          <div className="flex items-center justify-between text-white/70 mb-1 font-mono">
            <span className="flex items-center gap-1.5 text-[11px]">
              <CloudRain className="w-3.5 h-3.5 text-chartreuse" />
              PRECIPITATION INTENSITY
            </span>
            <span className="font-bold text-white">{rainfallMm.toFixed(1)} mm</span>
          </div>
          <input
            type="range"
            min={20}
            max={350}
            step={5}
            value={rainfallMm}
            onChange={(e) => {
              onScenarioChange('CUSTOM');
              onRainfallChange(parseFloat(e.target.value));
            }}
            className="w-full h-1.5  appearance-none cursor-pointer accent-chartreuse"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-white/70 mb-1 font-mono">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-violet" />
              STORM ACCUMULATION WINDOW
            </span>
            <span className="font-bold text-white">{durationHours} Hours</span>
          </div>
          <input
            type="range"
            min={3}
            max={72}
            step={3}
            value={durationHours}
            onChange={(e) => {
              onScenarioChange('CUSTOM');
              onDurationChange(parseInt(e.target.value, 10));
            }}
            className="w-full h-1.5  appearance-none cursor-pointer accent-violet"
          />
        </div>
      </div>

      {/* Trigger Simulation Button */}
      <button
        onClick={onRunSimulation}
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-chartreuse hover:bg-chartreuse/90 text-graphite-950 font-tight font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition shadow-lg shadow-chartreuse/20 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-graphite-950 border-t-transparent rounded-full animate-spin" />
            <span>COMPUTING HYDRO RUNOFF & PHYSICAL EXPOSURE...</span>
          </>
        ) : (
          <>
            <Cpu className="w-4 h-4" />
            <span>EXECUTE 3D DIGITAL TWIN SIMULATION</span>
          </>
        )}
      </button>
    </div>
  );
};
