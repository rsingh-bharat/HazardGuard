"use client";

import React, { useState, useEffect } from "react";
import { Map } from "@/components/map/Map";
import { RainfallLayer } from "@/components/map/RainfallLayer";
import { ProbabilityLayer } from "@/components/map/ProbabilityLayer";
import { RegimeLayer } from "@/components/map/RegimeLayer";
import { DistrictForecast } from "@/components/forecast/DistrictForecast";
import { TimelinePlayer } from "@/components/forecast/TimelinePlayer";
import { LayerControl } from "@/components/map/LayerControl";
import { useShareableState } from "@/lib/state/useShareableState";
import { useLiveForecast } from "@/lib/state/LiveForecastContext";
import { OfficialBoundaryLayer } from "@/components/map/OfficialBoundaryLayer";
import { Layers } from "lucide-react";
import { Search, Filter, MapPin, ChevronDown, X, SlidersHorizontal } from "lucide-react";

// --- glass helpers ---------------------------------------------
const glassCard: React.CSSProperties = {
  background:
    "linear-gradient(180deg,rgba(255,255,255,.20) 0%,rgba(255,255,255,.258) 24%,rgba(255,255,255,.252) 78%,rgba(255,255,255,.232) 100%)",
  backdropFilter: "blur(26px) saturate(118%)",
  WebkitBackdropFilter: "blur(26px) saturate(118%)",
  border: "1px solid rgba(255,255,255,.20)",
};
const glassSoft: React.CSSProperties = {
  background: "rgba(255,255,255,.09)",
  backdropFilter: "blur(16px) saturate(115%)",
  WebkitBackdropFilter: "blur(16px) saturate(115%)",
  border: "1px solid rgba(255,255,255,.13)",
};

const ALERT_COLOR: Record<string, string> = {
  RED: "#FF3B30",
  ORANGE: "#FFB347",
  YELLOW: "#FFD60A",
  GREEN: "#C8FF3D",
};

export default function ForecastPageClient() {
  const {
    selectedDistrictId,
    selectedStateId,
    activeLeadHours,
    activeLayers,
    showAnimation,
    updateState,
    toggleLayer,
  } = useShareableState();

  const { forecasts } = useLiveForecast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>(
    selectedStateId || "ALL"
  );
  const [showList, setShowList] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const states = [
    { id: "ALL", name: "ALL STATES & UTs" },
    { id: "MH", name: "MAHARASHTRA" },
    { id: "KL", name: "KERALA" },
    { id: "OR", name: "ODISHA" },
    { id: "GJ", name: "GUJARAT" },
    { id: "AS", name: "ASSAM" },
    { id: "UT", name: "UTTARAKHAND" },
    { id: "HP", name: "HIMACHAL PRADESH" },
    { id: "WB", name: "WEST BENGAL" },
    { id: "AP", name: "ANDHRA PRADESH" },
    { id: "TS", name: "TELANGANA" },
    { id: "TN", name: "TAMIL NADU" },
    { id: "KA", name: "KARNATAKA" },
    { id: "BR", name: "BIHAR" },
  ];

  const filteredForecasts = forecasts.filter((f) => {
    const matchesSearch =
      f.geography.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.geography.stateName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState =
      selectedState === "ALL" ||
      f.geography.stateId.toUpperCase() === selectedState;
    return matchesSearch && matchesState;
  });

  const sortedForecasts = [...filteredForecasts].sort(
    (a, b) => b.rainfall.correctedMm - a.rainfall.correctedMm
  );

  const selectedDistrict = selectedDistrictId
    ? forecasts.find(
        (f) =>
          f.geography.districtId.toLowerCase() === selectedDistrictId.toLowerCase()
      ) || null
    : null;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
      {/* -- Full-screen Map Stage ----------------- */}
      <div className="absolute inset-0 z-0">
        <Map
          activeLayers={activeLayers}
          selectedDistrictId={selectedDistrictId}
        >
          <OfficialBoundaryLayer />
          <RainfallLayer
            forecasts={forecasts}
            visible={activeLayers.includes("rainfall")}
            showAnimation={showAnimation && activeLayers.includes("rainfall")}
            onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
          />
          <ProbabilityLayer
            forecasts={forecasts}
            visible={activeLayers.includes("heavyRainProbability")}
          />
          <RegimeLayer
            forecasts={forecasts}
            visible={activeLayers.includes("weatherRegime")}
          />
        </Map>
      </div>

      {showLayerPanel && (
        <LayerControl
          activeLayers={activeLayers}
          onToggleLayer={toggleLayer}
          bottomOffset={130}
          leftOffset={16}
        />
      )}

      <button
        className="absolute z-30 flex items-center gap-2 transition hover:brightness-110"
        style={{
          bottom: 76,
          left: 16,
          ...glassSoft,
          borderRadius: 14,
          padding: "9px 14px",
          color: showLayerPanel ? "#C8FF3D" : "rgba(255,255,255,.80)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          border: showLayerPanel ? "1px solid rgba(200,255,61,.40)" : "1px solid rgba(255,255,255,.14)",
          background: showLayerPanel ? "rgba(200,255,61,.10)" : "rgba(255,255,255,.09)",
        }}
        onClick={() => setShowLayerPanel(!showLayerPanel)}
      >
        <Layers size={13} style={{ color: showLayerPanel ? "#C8FF3D" : "rgba(255,255,255,.70)" }} />
        LAYERS
        {showLayerPanel && <X size={11} />}
      </button>

      {/* -- TOP: Page header strip ---------------- */}
      <div
        className="absolute z-20 flex items-center justify-between px-5 py-3"
        style={{ top: 0, left: 0, right: 0, ...glassSoft, borderBottom: "1px solid rgba(255,255,255,.13)" }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Inter Tight', Inter, sans-serif",
              fontWeight: 500,
              fontSize: 18,
              color: "#ffffff",
              letterSpacing: "-0.3px",
            }}
          >
            FORECAST INTELLIGENCE
          </h1>
          <p style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>
            RAW ENSEMBLE - 72-HOUR DISTRICT OUTLOOK
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Lead hours badge */}
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: "rgba(200,255,61,.14)",
              border: "1px solid rgba(200,255,61,.35)",
              color: "#C8FF3D",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            T+{activeLeadHours}H
          </span>
          {/* Toggle list */}
          <button
            onClick={() => setShowList(!showList)}
            className="flex items-center gap-1.5 transition hover:brightness-110"
            style={{
              padding: "5px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.18)",
              color: "rgba(255,255,255,.80)",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <SlidersHorizontal size={12} />
            {showList ? "Hide Panel" : "Show Panel"}
          </button>
        </div>
      </div>

      {/* -- RIGHT: District list glass panel ----- */}
      {showList && (
        <div
          className="absolute z-20 flex flex-col overflow-hidden"
          style={{ top: 72, right: 16, bottom: 80, width: 340, ...glassCard, borderRadius: 20 }}
        >
          {/* Search + filter header */}
          <div
            className="p-3 space-y-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,.13)", flexShrink: 0 }}
          >
            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "rgba(255,255,255,.40)" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search districts..."
                style={{
                  width: "100%",
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.15)",
                  borderRadius: 10,
                  color: "#ffffff",
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            {/* State filter + count */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center flex-1" style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "6px 10px" }}>
                <Filter size={11} style={{ color: "#C8FF3D", flexShrink: 0 }} />
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    updateState({ selectedStateId: e.target.value === "ALL" ? null : e.target.value });
                  }}
                  style={{ background: "transparent", color: "#ffffff", fontSize: 11, fontWeight: 600, border: "none", outline: "none", cursor: "pointer", flex: 1, marginLeft: 6 }}
                >
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={11} style={{ color: "rgba(255,255,255,.40)", flexShrink: 0 }} />
              </div>
              <span style={{ color: "rgba(255,255,255,.50)", fontSize: 11, whiteSpace: "nowrap" }}>
                {filteredForecasts.length} districts
              </span>
            </div>
          </div>

          {/* District list or detail */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-2">
            {selectedDistrict ? (
              <DistrictForecast
                district={selectedDistrict}
                onBack={() => updateState({ selectedDistrictId: null })}
              />
            ) : (
              <div className="space-y-1">
                {filteredForecasts.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,.40)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                    No districts match your filter.
                  </p>
                )}
                {sortedForecasts.map((d) => {
                  const ac = ALERT_COLOR[d.rainfall.alertLevel] || "#C8FF3D";
                  return (
                    <div
                      key={d.geography.districtId}
                      onClick={() => updateState({ selectedDistrictId: d.geography.districtId })}
                      className="flex items-center justify-between cursor-pointer transition-all duration-150"
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,.05)",
                        border: "1px solid rgba(255,255,255,.10)",
                        marginBottom: 2,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.10)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,.05)"; }}
                    >
                      <div>
                        <div style={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }}>
                          {d.geography.districtName}
                        </div>
                        <div style={{ color: "rgba(255,255,255,.50)", fontSize: 10, marginTop: 2 }}>
                          {d.geography.stateName} - {d.regime.label.replace(/_/g, " ")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div style={{ color: ac, fontSize: 13, fontWeight: 700 }}>
                          {d.rainfall.correctedMm.toFixed(1)} mm
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: `${ac}22`,
                            border: `1px solid ${ac}66`,
                            color: ac,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {d.rainfall.alertLevel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- BOTTOM: Timeline strip -- */}
      <div
        className="absolute z-20"
        style={{ left: 16, right: 80, bottom: 16 }}
      >
        <div style={{ ...glassSoft, borderRadius: 16, padding: "10px 16px" }}>
          <TimelinePlayer
            activeLeadHours={activeLeadHours}
            onSelectLeadHours={(h) => updateState({ activeLeadHours: h })}
          />
        </div>
      </div>
    </div>
  );
}
