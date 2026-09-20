// TwinToolbar.tsx
'use client';

import React from "react";
import { ScenarioType, SimulationSummary, ProvenanceInfo, CityId } from "@/lib/contracts/impact";
import { CITY_PROFILES } from "@/lib/impact/cityProfiles";
import {
  AlertTriangle,
  Info,
  Activity,
  RotateCcw,
  Sliders,
  Crosshair
} from "lucide-react";

export interface TwinToolbarProps {
  currentScenario: ScenarioType;
  customRainfallMm: number;
  onSelectScenario: (scen: ScenarioType) => void;
  onCustomRainfallChange: (val: number) => void;
  summary: SimulationSummary;
  provenance: ProvenanceInfo;
  cameraPreset: string;
  onSelectCameraPreset: (preset: string) => void;
  onOpenProvenance: () => void;
  isSimulating: boolean;
  onRunSimulation: () => void;
  currentCity: CityId;
  onSelectCity: (city: CityId) => void;
  lowMm?: number;
  baseMm?: number;
  highMm?: number;
  p10Mm?: number;
  p50Mm?: number;
  p90Mm?: number;
}

export const TwinToolbar: React.FC<TwinToolbarProps> = ({
  currentScenario,
  customRainfallMm,
  onSelectScenario,
  onCustomRainfallChange,
  summary,
  provenance,
  cameraPreset,
  onSelectCameraPreset,
  onOpenProvenance,
  isSimulating,
  onRunSimulation,
  currentCity,
  onSelectCity,
}) => {
  const activeProfile = CITY_PROFILES[currentCity] || CITY_PROFILES.bengaluru;

  return (
    <div
      className="w-full pointer-events-auto mx-auto px-4 py-3 flex flex-wrap items-center gap-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.05) 100%)",
        backdropFilter: "blur(26px) saturate(118%)",
        WebkitBackdropFilter: "blur(26px) saturate(118%)",
        border: "1px solid rgba(255,255,255,.15)",
        borderRadius: "20px",
      }}
    >
      {/* Aurora sheen */}
      <div className="absolute inset-0 pointer-events-none rounded-[20px]" style={{
        background: "linear-gradient(100deg, transparent 0%, rgba(255,255,255,.05) 50%, transparent 100%)",
        transform: "skewX(-18deg)",
      }} />

      {/* City Switcher */}
      <div className="flex items-center bg-white/5 rounded-full p-1 gap-1 border border-white/10 relative z-10">
        <div className="pl-3 pr-2 py-1 text-[11px] font-mono text-white/50 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-[#C8FF3D]" />
          <span>CITY</span>
        </div>
        {(["delhi", "mumbai", "bengaluru"] as CityId[]).map(city => (
          <button
            key={city}
            onClick={() => onSelectCity(city)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-mono tracking-wider uppercase transition-all ${
              currentCity === city
                ? "bg-white/10 text-[#C8FF3D] font-bold shadow-[0_0_10px_rgba(200,255,61,0.2)]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {city === "mumbai" ? "MUMBAI" : city === "delhi" ? "DELHI NCR" : "BENGALURU"}
          </button>
        ))}
      </div>

      {/* Scenario Selection */}
      <div className="flex items-center bg-white/5 rounded-full p-1 gap-1 border border-white/10 relative z-10">
        <div className="pl-3 pr-2 py-1 text-[11px] font-mono text-white/50 uppercase tracking-widest font-semibold hidden sm:block">
          SCENARIO
        </div>
        {[
          { id: "LOW",  alias: "P10", color: "text-[#C8FF3D]" },
          { id: "BASE", alias: "P50", color: "text-[#FFB347]" },
          { id: "HIGH", alias: "P90", color: "text-[#FF3B30]" }
        ].map(scen => {
          const isActive = currentScenario === scen.id || currentScenario === scen.alias;
          return (
            <button
              key={scen.id}
              onClick={() => onSelectScenario(scen.id as ScenarioType)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
                isActive
                  ? `bg-white/10 ${scen.color} font-bold shadow-sm`
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? (scen.id === 'LOW' ? 'bg-[#C8FF3D]' : scen.id === 'BASE' ? 'bg-[#FFB347]' : 'bg-[#FF3B30]') : "bg-white/30"}`} />
              <span>{scen.id}</span>
            </button>
          );
        })}
        <button
          onClick={() => onSelectScenario("CUSTOM")}
          className={`px-4 py-1.5 rounded-full text-[12px] font-mono uppercase tracking-wider transition-all flex items-center gap-2 ${
            currentScenario === "CUSTOM"
              ? "bg-white/10 text-white font-bold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>CUSTOM</span>
        </button>
      </div>

      {/* Custom Rainfall Slider */}
      {currentScenario === "CUSTOM" && (
        <div className="flex items-center gap-3 bg-white/10 rounded-full border border-white/20 px-4 py-1.5 relative z-10">
          <span className="text-[11px] text-white/70 font-mono uppercase tracking-widest">INPUT:</span>
          <input
            type="range"
            min={0}
            max={250}
            step={5}
            value={customRainfallMm}
            onChange={(e) => onCustomRainfallChange(Number(e.target.value))}
            className="w-32 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#C8FF3D]"
          />
          <span className="text-sm font-mono font-bold text-[#C8FF3D] min-w-[50px]">{Math.round(customRainfallMm)}mm</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Telemetry Chips */}
      <div className="hidden xl:flex items-center gap-3 relative z-10">
        <div className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center min-w-[70px]">
          <span className="text-[10px] uppercase font-mono text-white/50 tracking-widest mb-0.5">DPTH</span>
          <span className="text-sm font-bold text-white font-mono leading-none">
            {summary.peak_water_depth_m.toFixed(2)}m
          </span>
        </div>
        <div className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center min-w-[70px]">
          <span className="text-[10px] uppercase font-mono text-white/50 tracking-widest mb-0.5">AREA</span>
          <span className="text-sm font-bold text-white font-mono leading-none">
            {summary.peak_inundated_area_km2.toFixed(1)}km²
          </span>
        </div>
        <div className="px-3 py-1.5 bg-[#FF3B30]/10 rounded-xl border border-[#FF3B30]/30 flex flex-col items-center min-w-[70px]">
          <span className="text-[10px] uppercase font-mono text-[#FF3B30] tracking-widest mb-0.5">WARN</span>
          <span className="text-sm font-bold text-[#FF3B30] font-mono leading-none flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {summary.critical_warnings_count}
          </span>
        </div>
      </div>

      {/* Camera Presets */}
      <div className="flex items-center bg-white/5 rounded-full p-1 gap-1 border border-white/10 relative z-10">
        <div className="pl-3 pr-2 py-1 text-[11px] font-mono text-white/50 uppercase tracking-widest font-semibold hidden lg:flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-[#C8FF3D]" />
          <span>ANGLE</span>
        </div>
        {activeProfile.cameraPresets.map((preset) => {
          const isSelected = cameraPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectCameraPreset(preset.id)}
              title={preset.description}
              className={`px-4 py-1.5 rounded-full text-[12px] font-mono tracking-wider uppercase transition-all flex items-center gap-2 ${
                isSelected
                  ? "bg-white/10 text-[#C8FF3D] font-bold"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-[#C8FF3D]" : "bg-white/30"}`} />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Execute Simulation */}
      <button
        onClick={onRunSimulation}
        disabled={isSimulating}
        className={`px-5 py-2 rounded-full text-[12px] font-mono tracking-widest uppercase font-bold flex items-center gap-2 transition-all relative z-10 ${
          isSimulating
            ? "bg-white/10 text-white/50 cursor-not-allowed border border-white/10"
            : "bg-[#C8FF3D] text-black hover:bg-[#b0e625] shadow-[0_0_15px_rgba(200,255,61,0.3)]"
        }`}
      >
        {isSimulating ? (
          <>
            <RotateCcw className="w-4 h-4 animate-spin text-white/50" />
            <span>CALCULATING</span>
          </>
        ) : (
          <>
            <Activity className="w-4 h-4" />
            <span>EXECUTE</span>
          </>
        )}
      </button>
    </div>
  );
};
