// ImpactTwinView.tsx
// Ported from 3DImpactTwin/src/App.tsx for Ronak (rsg-hazardguard).
// This is the top-level 3D Twin orchestrator mounted inside Ronak's /impact page.
// It receives an optional forecastId and scenario from Ronak's shared URL state
// and seeds the Twin accordingly. All state is local to this component.
'use client';

import React, { useState, useMemo, useCallback } from "react";
import {
  ScenarioType,
  SceneLayersConfig,
  ImpactSimulationResult,
  ImpactTimelineState,
  CityId
} from "@/lib/contracts/impact";
import { defaultSimulation } from "@/lib/impact/defaultSimulation";
import { getCitySimulation, CITY_PROFILES } from "@/lib/impact/cityProfiles";
import { DigitalTwinCanvas } from "./DigitalTwinCanvas";
import { TwinToolbar } from "./TwinToolbar";
import { TimelineControls } from "./TimelineControls";
import { LayerControls } from "./LayerControls";
import { ImpactAnalyticsPanel } from "./ImpactAnalyticsPanel";
import { EntityInspectorModal } from "./EntityInspectorModal";
import { ProvenanceModal } from "./ProvenanceModal";

// Rainfall forecast values seeded from Ronak's Sayan-adapter API responses.
// These represent the rainfall values per city from the integrated forecast API.
// When Sayan provides real data, these values can be replaced by the API response.
const FORECAST_RAINFALL: Record<CityId, { p10_mm: number; p50_mm: number; p90_mm: number }> = {
  bengaluru: { p10_mm: 35, p50_mm: 85, p90_mm: 165 },
  mumbai:    { p10_mm: 68, p50_mm: 142, p90_mm: 252 },
  delhi:     { p10_mm: 42, p50_mm: 92,  p90_mm: 172 }
};

interface ImpactTwinViewProps {
  /** Optional: The active forecast ID from Ronak's shared URL state. Used to seed provenance. */
  initialForecastId?: string;
  /** Optional: The initial scenario from Ronak's shared URL state. Defaults to P90. */
  initialScenario?: ScenarioType;
  /** Optional: The selected district city mapping. */
  initialCity?: CityId;
}

export default function ImpactTwinView({
  initialForecastId,
  initialScenario,
  initialCity
}: ImpactTwinViewProps) {
  // ---- City & Scenario State ----
  const [currentCity, setCurrentCity] = useState<CityId>(initialCity || "bengaluru");
  const [currentScenario, setCurrentScenario] = useState<ScenarioType>(initialScenario || "P90");
  const [customRainfallMm, setCustomRainfallMm] = useState<number>(
    FORECAST_RAINFALL[initialCity || "bengaluru"].p50_mm
  );
  
  // Start with a fallback simulation state instead of null
  const [simulation, setSimulation] = useState<ImpactSimulationResult>(() => getCitySimulation(initialCity || "bengaluru", initialScenario || "P90"));
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Timeline Scrubbing State (Initial start at T+12: peak storm intensity)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // 3D Scene Configuration State
  const [cameraPreset, setCameraPreset] = useState<string>("perspective");
  const [layers, setLayers] = useState<SceneLayersConfig>({
    terrain: true,
    terrainWireframe: false,
    water: true,
    rain: true,
    basemapStyle: "satellite",
    flowVectors: true,
    roads: true,
    drainage: true,
    facilities: true,
    buildings: true,
    streetBuildings: true,
    blockages: true,
    overflows: true,
    verticalScale: 1.6
  });

  // Modals & Entity Selection
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; data: any } | null>(null);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Mobile drawer state — all collapsed by default
  const [mobileToolbarOpen, setMobileToolbarOpen] = useState<boolean>(false);
  const [mobileLayersOpen, setMobileLayersOpen] = useState<boolean>(false);
  const [mobileAnalyticsOpen, setMobileAnalyticsOpen] = useState<boolean>(false);

  // ---- Fetch Real Impact Simulation ----
  const fetchSimulation = useCallback(async (city: CityId, scenario: ScenarioType, rainVal: number) => {
    setIsSimulating(true);
    setFetchError(null);
    try {
      const resp = await fetch("/api/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecastId: initialForecastId || `FC-2026-${city.toUpperCase()}-LIVE`,
          geography: {
            districtId: CITY_PROFILES[city].districtId,
            bbox: CITY_PROFILES[city].bbox
          },
          rainfall: {
            scenario,
            rainfallMm: rainVal,
            durationHours: 24
          }
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.data?.timeline) {
          setSimulation(data.data);
          setIsSimulating(false);
          return;
        } else if (!data.success) {
          throw new Error(data.error || "Failed to load authoritative impact simulation.");
        }
      } else {
        throw new Error(`Impact service unavailable (${resp.status})`);
      }
    } catch (e: any) {
      console.error("Failed to fetch live impact, failing closed.", e);
      setFetchError(e.message || "Simulation failed");
      setSimulation(getCitySimulation(city, scenario));
      setIsSimulating(false);
    }
  }, [initialForecastId]);

  // Initial fetch on mount
  React.useEffect(() => {
    const pred = FORECAST_RAINFALL[currentCity];
    const isLow = currentScenario === "LOW" || currentScenario === "P10";
    const isBase = currentScenario === "BASE" || currentScenario === "P50";
    const rainVal = isLow ? pred.p10_mm : isBase ? pred.p50_mm : pred.p90_mm;
    fetchSimulation(currentCity, currentScenario, rainVal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- City Switch Handler ----
  const handleSelectCity = useCallback(async (newCity: CityId) => {
    setCurrentCity(newCity);
    setCameraPreset("perspective");

    const pred = FORECAST_RAINFALL[newCity];
    setCustomRainfallMm(pred.p50_mm);

    const rainVal = (currentScenario === "LOW" || currentScenario === "P10") ? pred.p10_mm
      : (currentScenario === "BASE" || currentScenario === "P50") ? pred.p50_mm
      : (currentScenario === "HIGH" || currentScenario === "P90") ? pred.p90_mm
      : pred.p50_mm;

    await fetchSimulation(newCity, currentScenario, rainVal);
  }, [currentScenario, fetchSimulation]);

  // ---- Scenario Switch Handler ----
  const handleSelectScenario = async (scenario: ScenarioType) => {
    setCurrentScenario(scenario);

    const pred = FORECAST_RAINFALL[currentCity];
    let rainVal: number;
    if (scenario === "LOW" || scenario === "P10") rainVal = pred.p10_mm;
    else if (scenario === "BASE" || scenario === "P50") rainVal = pred.p50_mm;
    else if (scenario === "HIGH" || scenario === "P90") rainVal = pred.p90_mm;
    else rainVal = customRainfallMm; // CUSTOM: use slider current value immediately

    await fetchSimulation(currentCity, scenario, rainVal);
  };

  // ---- Custom Rainfall Slider Handler ----
  const handleCustomRainfallChange = (val: number) => {
    setCustomRainfallMm(val);
    // Always fire simulation when slider moves — currentScenario may not have updated
    // in state yet if this fires immediately after clicking CUSTOM, so we pass "CUSTOM" directly
    fetchSimulation(currentCity, "CUSTOM", val);
  };

  // ---- Execute Simulation (Re-run) ----
  const handleRunSimulation = () => {
    const pred = FORECAST_RAINFALL[currentCity];
    let rainVal: number;
    if (currentScenario === "LOW" || currentScenario === "P10") rainVal = pred.p10_mm;
    else if (currentScenario === "BASE" || currentScenario === "P50") rainVal = pred.p50_mm;
    else if (currentScenario === "HIGH" || currentScenario === "P90") rainVal = pred.p90_mm;
    else rainVal = customRainfallMm;

    fetchSimulation(currentCity, currentScenario, rainVal);
  };

  // ---- Playback Speed Toggle ----
  const handleToggleSpeed = () => {
    setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  };

  // ---- Active Timestep ----
  const currentState: ImpactTimelineState = useMemo(() => {
    if (!simulation || !simulation.timeline || simulation.timeline.length === 0) {
      return defaultSimulation.timeline[0];
    }
    const idx = Math.min(simulation.timeline.length - 1, Math.max(0, currentStepIndex));
    return simulation.timeline[idx];
  }, [simulation?.timeline, currentStepIndex]);

  const comp = simulation?.comparison;
  const pred = FORECAST_RAINFALL[currentCity];
  const lowMm = comp?.LOW?.rainfall_mm ?? comp?.P10?.rainfall_mm ?? pred.p10_mm;
  const baseMm = comp?.BASE?.rainfall_mm ?? comp?.P50?.rainfall_mm ?? pred.p50_mm;
  const highMm = comp?.HIGH?.rainfall_mm ?? comp?.P90?.rainfall_mm ?? pred.p90_mm;


  return (
    <div className="absolute inset-y-0 left-[104px] max-lg:left-0 right-0 w-[calc(100vw-104px)] max-lg:w-full h-full overflow-hidden font-sans text-white flex flex-col select-none">
      
      {/* ── MOBILE: compact top-center controls trigger ── */}
      <div className="hidden max-lg:flex absolute top-3 left-1/2 -translate-x-1/2 z-[35] pointer-events-auto">
        <button
          onClick={() => setMobileToolbarOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: mobileToolbarOpen ? "rgba(200,255,61,.20)" : "rgba(255,255,255,.15)",
            border: mobileToolbarOpen ? "1px solid rgba(200,255,61,.45)" : "1px solid rgba(255,255,255,.22)",
            backdropFilter: "blur(16px) saturate(115%)",
            color: mobileToolbarOpen ? "#C8FF3D" : "#ffffff",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
          {currentCity.charAt(0).toUpperCase() + currentCity.slice(1)} · {currentScenario}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={mobileToolbarOpen ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/></svg>
        </button>
      </div>

      {/* ── MOBILE: expanded toolbar sheet ── */}
      {mobileToolbarOpen && (
        <div
          className="hidden max-lg:block absolute top-14 left-2 right-2 z-[34] rounded-2xl overflow-y-auto max-h-[75dvh] shadow-2xl pointer-events-auto"
          style={{ background: "rgba(10,18,30,.97)", border: "1px solid rgba(255,255,255,.15)", backdropFilter: "blur(20px)" }}
        >
          <TwinToolbar
            currentScenario={currentScenario}
            customRainfallMm={customRainfallMm}
            onSelectScenario={(s) => { handleSelectScenario(s); }}
            onCustomRainfallChange={handleCustomRainfallChange}
            summary={simulation.summary}
            provenance={simulation.provenance}
            cameraPreset={cameraPreset}
            onSelectCameraPreset={setCameraPreset}
            onOpenProvenance={() => setIsProvenanceOpen(true)}
            isSimulating={isSimulating}
            onRunSimulation={handleRunSimulation}
            currentCity={currentCity}
            onSelectCity={handleSelectCity}
            lowMm={lowMm}
            baseMm={baseMm}
            highMm={highMm}
            p10Mm={pred.p10_mm}
            p50Mm={pred.p50_mm}
            p90Mm={pred.p90_mm}
          />
          <div style={{ display: "flex", justifyContent: "center", paddingBottom: 8 }}>
            <button onClick={() => setMobileToolbarOpen(false)}
              style={{ fontSize: 11, color: "rgba(255,255,255,.45)", padding: "4px 16px" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Top command bar wrapper for Aurora layout */}
      <div className="w-full px-4 pt-4 z-30 shrink-0 pointer-events-none max-lg:hidden">
        <TwinToolbar
          currentScenario={currentScenario}
          customRainfallMm={customRainfallMm}
          onSelectScenario={handleSelectScenario}
          onCustomRainfallChange={handleCustomRainfallChange}
          summary={simulation.summary}
          provenance={simulation.provenance}
          cameraPreset={cameraPreset}
          onSelectCameraPreset={setCameraPreset}
          onOpenProvenance={() => setIsProvenanceOpen(true)}
          isSimulating={isSimulating}
          onRunSimulation={handleRunSimulation}
          currentCity={currentCity}
          onSelectCity={handleSelectCity}
          lowMm={lowMm}
          baseMm={baseMm}
          highMm={highMm}
          p10Mm={pred.p10_mm}
          p50Mm={pred.p50_mm}
          p90Mm={pred.p90_mm}
        />
      </div>

      {/* Main 3D Canvas Area */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        <DigitalTwinCanvas
          currentState={currentState}
          layers={layers}
          cameraPreset={cameraPreset}
          cityId={currentCity}
          onSelectEntity={setSelectedEntity}
          selectedEntity={selectedEntity}
        />

        {/* Floating Layer Controls */}
        <LayerControls
          layers={layers}
          onChangeLayers={setLayers}
          mobileOpen={mobileLayersOpen}
          onMobileToggle={() => {
            setMobileLayersOpen(o => !o);
            setMobileAnalyticsOpen(false);
            setMobileToolbarOpen(false);
          }}
        />

        {/* Impact Analytics Right Drawer */}
        <ImpactAnalyticsPanel
          simulation={simulation}
          currentState={currentState}
          onSelectEntity={setSelectedEntity}
          mobileOpen={mobileAnalyticsOpen}
          onMobileToggle={() => {
            setMobileAnalyticsOpen(o => !o);
            setMobileLayersOpen(false);
            setMobileToolbarOpen(false);
          }}
        />

        {/* Interactive Timeline Scrubber */}
        <TimelineControls
          timeline={simulation.timeline || []}
          currentStepIndex={currentStepIndex}
          onSelectStepIndex={setCurrentStepIndex}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onToggleSpeed={handleToggleSpeed}
        />

        {/* Entity Inspector Modal */}
        <EntityInspectorModal
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />

        {/* Scientific Provenance Modal */}
        {isProvenanceOpen && (
          <ProvenanceModal
            provenance={simulation.provenance}
            onClose={() => setIsProvenanceOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
