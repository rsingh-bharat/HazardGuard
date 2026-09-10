// TwinToolbar.tsx
// Adapted from 3DImpactTwin/src/components/Header.tsx for Ronak (rsg-hazardguard).
// REMOVED: "HAZARDGUARD / SOUMY" branding, "LOC:" label, User Profile button.
// KEPT: City Switcher, Scenario Selection, Custom Rainfall Slider, Telemetry Chips, Camera Presets, Provenance.
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
    <header className="w-full bg-graphite-950/95 border-b border-graphite-800 text-warm-paper z-30 shrink-0 select-none relative">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-signal-red via-violet to-chartreuse opacity-40" />

      <div className="max-w-[1920px] mx-auto px-3 py-2 flex flex-wrap items-center gap-3">

        {/* City Switcher */}
        <div className="flex items-center bg-graphite-900 border border-graphite-800 p-0.5 gap-0.5">
          <div className="px-2 py-1 text-[10px] font-mono text-smoke uppercase tracking-widest font-semibold border-r border-graphite-800 flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-chartreuse" />
            <span>CITY</span>
          </div>
          {(["delhi", "mumbai", "bengaluru"] as CityId[]).map(city => (
            <button
              key={city}
              onClick={() => onSelectCity(city)}
              className={`px-3 py-1 text-[11px] font-mono tracking-wider uppercase transition-all ${
                currentCity === city
                  ? "bg-graphite-800 text-chartreuse border-b-2 border-chartreuse font-bold"
                  : "text-smoke hover:text-paper-dim hover:bg-graphite-800"
              }`}
            >
              {city === "mumbai" ? "MUMBAI" : city === "delhi" ? "DELHI NCR" : "BENGALURU"}
            </button>
          ))}
        </div>

        {/* Scenario Selection */}
        <div className="flex items-center bg-graphite-900 border border-graphite-800 p-0.5 gap-0.5">
          <div className="px-2 py-1 text-[10px] font-mono text-smoke uppercase tracking-widest font-semibold border-r border-graphite-800 hidden sm:block">
            SCENARIO:
          </div>
          {[
            { id: "LOW",  alias: "P10", color: "text-chartreuse", bg: "bg-chartreuse", border: "border-chartreuse" },
            { id: "BASE", alias: "P50", color: "text-amber",      bg: "bg-amber",      border: "border-amber"      },
            { id: "HIGH", alias: "P90", color: "text-signal-red", bg: "bg-signal-red", border: "border-signal-red" }
          ].map(scen => {
            const isActive = currentScenario === scen.id || currentScenario === scen.alias;
            return (
              <button
                key={scen.id}
                onClick={() => onSelectScenario(scen.id as ScenarioType)}
                className={`px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isActive
                    ? `bg-graphite-800 ${scen.color} border-b-2 ${scen.border} font-bold`
                    : "text-smoke hover:text-paper-dim hover:bg-graphite-800"
                }`}
              >
                <span className={`w-1.5 h-1.5 ${isActive ? scen.bg : "bg-smoke"}`} />
                <span>{scen.id}</span>
              </button>
            );
          })}
          <button
            onClick={() => onSelectScenario("CUSTOM")}
            className={`px-3 py-1 text-[11px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              currentScenario === "CUSTOM"
                ? "bg-graphite-800 text-violet border-b-2 border-violet font-bold"
                : "text-smoke hover:text-paper-dim hover:bg-graphite-800"
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>CUSTOM</span>
          </button>
        </div>

        {/* Custom Rainfall Slider — 0 to 250 mm in 5 mm steps */}
        {currentScenario === "CUSTOM" && (
          <div className="flex items-center gap-2 bg-violet-deep border border-violet/40 px-3 py-1">
            <span className="text-[10px] text-violet font-mono uppercase tracking-widest">INPUT:</span>
            <input
              type="range"
              min={0}
              max={250}
              step={5}
              value={customRainfallMm}
              onChange={(e) => onCustomRainfallChange(Number(e.target.value))}
              className="w-36 h-1 bg-graphite-800 appearance-none cursor-pointer accent-violet"
            />
            <span className="text-xs font-mono font-bold text-violet">{Math.round(customRainfallMm)} mm</span>
          </div>
        )}


        {/* Live / Fallback Provenance Indicator */}
        <div className="hidden md:flex items-center">
          {provenance?.is_client_mock ? (
            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-mono font-bold tracking-wider">
              CLIENT FALLBACK
            </span>
          ) : provenance?.authoritative_model_status === "RAW_NWP_WEATHERNEXT3" || provenance?.authoritative_provider === "WeatherNext3" ? (
            <span className="px-2 py-0.5 bg-chartreuse/20 border border-chartreuse/40 text-chartreuse text-[9px] font-mono font-bold tracking-wider">
              WEATHERNEXT3 RAW NWP
            </span>
          ) : provenance?.authoritative_fallback === true ? (
            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-mono font-bold tracking-wider">
              RAW NWP FALLBACK
            </span>
          ) : provenance?.authoritative_fallback === false ? (
            <span className="px-2 py-0.5 bg-chartreuse/20 border border-chartreuse/40 text-chartreuse text-[9px] font-mono font-bold tracking-wider">
              LIVE ML CORRECTED
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-graphite-800 border border-graphite-700 text-smoke text-[9px] font-mono font-bold tracking-wider">
              LIVE ENGINE
            </span>
          )}
        </div>

        {/* Telemetry Chips */}
        <div className="hidden xl:flex items-center gap-2 ml-auto">
          <div className="px-2 py-1 bg-graphite-900 border border-graphite-800 flex flex-col min-w-[70px]">
            <span className="text-[9px] uppercase font-mono text-smoke tracking-widest">DPTH</span>
            <span className="text-xs font-bold text-warm-paper font-mono">
              {summary.peak_water_depth_m.toFixed(2)}m
            </span>
          </div>
          <div className="px-2 py-1 bg-graphite-900 border border-graphite-800 flex flex-col min-w-[70px]">
            <span className="text-[9px] uppercase font-mono text-smoke tracking-widest">AREA</span>
            <span className="text-xs font-bold text-warm-paper font-mono">
              {summary.peak_inundated_area_km2.toFixed(1)}km²
            </span>
          </div>
          <div className="px-2 py-1 bg-graphite-900 border border-signal-red/30 flex flex-col min-w-[70px]">
            <span className="text-[9px] uppercase font-mono text-signal-red tracking-widest">WARN</span>
            <span className="text-xs font-bold text-signal-red font-mono flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {summary.critical_warnings_count}
            </span>
          </div>
        </div>

        {/* Camera Presets */}
        <div className="flex items-center bg-graphite-900 border border-graphite-800 p-0.5 gap-0.5">
          <div className="px-2 py-1 text-[10px] font-mono text-smoke uppercase tracking-widest font-semibold border-r border-graphite-800 hidden md:flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-chartreuse" />
            <span>ANGLE</span>
          </div>
          {activeProfile.cameraPresets.map((preset) => {
            const isSelected = cameraPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectCameraPreset(preset.id)}
                title={preset.description}
                className={`px-3 py-1 text-[11px] font-mono tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-graphite-800 text-chartreuse border-b-2 border-chartreuse font-bold"
                    : "text-chartreuse opacity-70 hover:opacity-100 hover:bg-graphite-800"
                }`}
              >
                <span className={`w-1.5 h-1.5 bg-chartreuse ${preset.isStreetView && !isSelected ? "animate-pulse" : ""}`} />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Provenance */}
        <button
          onClick={onOpenProvenance}
          className="p-1.5 bg-graphite-900 hover:bg-graphite-800 text-smoke hover:text-warm-paper border border-graphite-800 transition"
          title="Scientific Provenance & Metadata"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* Execute Simulation */}
        <button
          onClick={onRunSimulation}
          disabled={isSimulating}
          className={`px-4 py-1.5 text-[11px] font-mono tracking-widest uppercase font-bold flex items-center gap-2 transition ${
            isSimulating
              ? "bg-graphite-800 text-smoke cursor-not-allowed border border-graphite-800"
              : "bg-chartreuse text-graphite-950 hover:bg-white border border-chartreuse"
          }`}
        >
          {isSimulating ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-smoke" />
              <span>CALCULATING</span>
            </>
          ) : (
            <>
              <Activity className="w-3.5 h-3.5" />
              <span>EXECUTE</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
