"use client";
import { useLiveForecast } from "@/lib/state/LiveForecastContext";

import React, { useState, useEffect } from "react";
import { Map } from "@/components/map/Map";
import { RainfallLayer } from "@/components/map/RainfallLayer";
import { ProbabilityLayer } from "@/components/map/ProbabilityLayer";
import { RegimeLayer } from "@/components/map/RegimeLayer";
import { WindStreamLayer } from "@/components/map/WindStreamLayer";
import { InfrastructureLayer } from "@/components/map/InfrastructureLayer";
import { HazardMarkersLayer } from "@/components/map/HazardMarkersLayer";
import { OfficialBoundaryLayer } from "@/components/map/OfficialBoundaryLayer";
import { LayerControl } from "@/components/map/LayerControl";
import { AnimationOverlay } from "@/components/map/AnimationOverlay";
import { TimelinePlayer } from "@/components/forecast/TimelinePlayer";
import { useShareableState } from "@/lib/state/useShareableState";
import { ForecastSnapshot } from "@/lib/contracts/forecast";
import mockForecasts from "@/data/mock/forecast.json";
import {
  X, Layers, AlertTriangle, Droplets,
  Waves, Cpu, FileText
} from "lucide-react";
import Link from "next/link";
import { getRegimeDisplayName } from "@/lib/utils";

// ─── Glass style constants ──────────────────────────────────────
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
  border: "1px solid rgba(255,255,255,.14)",
};

// ─── Alert colour helper ────────────────────────────────────────
function alertColor(level: string) {
  switch (level) {
    case "RED":    return { bg: "rgba(255,59,48,.22)",  border: "rgba(255,59,48,.50)",  text: "#FF3B30" };
    case "ORANGE": return { bg: "rgba(255,179,71,.18)", border: "rgba(255,179,71,.45)", text: "#FFB347" };
    case "YELLOW": return { bg: "rgba(255,214,10,.15)", border: "rgba(255,214,10,.40)", text: "#FFD60A" };
    default:       return { bg: "rgba(200,255,61,.14)", border: "rgba(200,255,61,.40)", text: "#C8FF3D" };
  }
}

// ─── District detail card shown on map when district selected ───
function DistrictDetailPanel({
  district,
  onClose,
}: {
  district: ForecastSnapshot;
  onClose: () => void;
}) {
  const { geography, rainfall, regime, probability, riversAtRisk } = district;
  const ac = alertColor(rainfall.alertLevel);

  return (
    <div
      className="animate-slide-r"
      style={{
        ...glassCard,
        borderRadius: 24,
        overflow: "hidden",
        width: 360,
      }}
    >
      {/* Alert banner */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: ac.bg, borderBottom: `1px solid ${ac.border}` }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: ac.text }} />
          <span style={{ color: ac.text, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>
            {rainfall.alertLevel} ALERT IN EFFECT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: ac.text, fontSize: 12, fontWeight: 700 }}>
            {rainfall.correctedMm.toFixed(1)} mm
          </span>
          <button
            onClick={onClose}
            className="transition hover:opacity-70"
            style={{ color: "rgba(255,255,255,.70)", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* District name + coords */}
        <div>
          <h2
            style={{
              fontFamily: "'Inter Tight', Inter, sans-serif",
              fontWeight: 600,
              fontSize: 28,
              color: "#ffffff",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            {geography.districtName}
          </h2>
          <p style={{ color: "rgba(255,255,255,.55)", fontSize: 11 }}>
            {geography.stateName.toUpperCase()} · {geography.lat.toFixed(2)}°N {geography.lon.toFixed(2)}°E · T+{district.leadHours}H
          </p>
        </div>

        {/* Big rainfall number */}
        <div
          className="flex items-end justify-between py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,.12)", borderBottom: "1px solid rgba(255,255,255,.12)" }}
        >
          <div>
            <p style={{ color: "rgba(255,255,255,.50)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
              AI CORRECTED · RAW ENSEMBLE
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontFamily: "'Inter Tight', Inter, sans-serif",
                  fontWeight: 500,
                  fontSize: 56,
                  color: "#ffffff",
                  letterSpacing: "-2px",
                  lineHeight: 1,
                }}
              >
                {rainfall.correctedMm.toFixed(1)}
              </span>
              <span style={{ color: "rgba(255,255,255,.60)", fontSize: 20 }}>mm</span>
            </div>
            {rainfall.rawNwpMm !== null && (
              <p style={{ color: "rgba(255,255,255,.40)", fontSize: 10, marginTop: 4 }}>
                Raw NWP: <span style={{ textDecoration: "line-through" }}>{rainfall.rawNwpMm.toFixed(1)} mm</span>
              </p>
            )}
          </div>
          {/* P10/P50/P90 mini */}
          <div className="flex flex-col gap-1 text-right">
            {[
              { l: "P10", v: rainfall.p10Mm },
              { l: "P50", v: rainfall.p50Mm },
              { l: "P90", v: rainfall.p90Mm },
            ].map(({ l, v }) => (
              <div key={l}>
                <span style={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{(v ?? 0).toFixed(0)}mm</span>
                <span style={{ color: "rgba(255,255,255,.40)", fontSize: 9, marginLeft: 4 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regime */}
        <div
          className="flex items-start gap-3 p-3"
          style={{ background: "rgba(121,104,255,.12)", border: "1px solid rgba(121,104,255,.30)", borderRadius: 12 }}
        >
          <Droplets size={14} style={{ color: "#7968FF", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ color: "#ffffff", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" }}>
                REGIME: {getRegimeDisplayName(regime.label).toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  background: "rgba(121,104,255,.25)",
                  border: "1px solid rgba(121,104,255,.50)",
                  borderRadius: 999,
                  color: "#7968FF",
                  fontWeight: 700,
                }}
              >
                {(regime.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, lineHeight: 1.5 }}>
              {regime.description}
            </p>
          </div>
        </div>

        {/* Probability row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "HEAVY RAIN", val: probability.heavyRain_64mm, threshold: ">64mm" },
            { label: "VERY HEAVY", val: probability.veryHeavy_115mm, threshold: ">115mm" },
            { label: "EXTREME", val: probability.extremelyHeavy_204mm, threshold: ">204mm" },
          ].map(({ label, val, threshold }) => {
            const pct = Math.round(val * 100);
            const col = pct > 70 ? "#FF3B30" : pct > 40 ? "#FFB347" : "#C8FF3D";
            return (
              <div
                key={label}
                className="flex flex-col items-center p-2 gap-1"
                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 10 }}
              >
                <span style={{ color: col, fontSize: 18, fontWeight: 700 }}>{pct}%</span>
                <span style={{ color: "rgba(255,255,255,.60)", fontSize: 9, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
                <span style={{ color: "rgba(255,255,255,.35)", fontSize: 8 }}>{threshold}</span>
              </div>
            );
          })}
        </div>

        {/* Rivers at risk */}
        {riversAtRisk.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Waves size={12} style={{ color: "#C8FF3D" }} />
              <span style={{ color: "#ffffff", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Rivers at Risk
              </span>
            </div>
            <div className="space-y-1">
              {riversAtRisk.map((r, i) => {
                const rc = r.dangerLevel === "SEVERE" ? "#FF3B30" : r.dangerLevel === "DANGER" ? "#FFB347" : "#FFD60A";
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2"
                    style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", borderRadius: 8 }}
                  >
                    <div>
                      <span style={{ color: "#ffffff", fontSize: 11, fontWeight: 600 }}>{r.riverName}</span>
                      <span style={{ color: "rgba(255,255,255,.45)", fontSize: 10, marginLeft: 6 }}>{r.basin}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 9, fontWeight: 700, padding: "1px 7px",
                        background: `${rc}22`, border: `1px solid ${rc}55`,
                        borderRadius: 999, color: rc, letterSpacing: "0.05em",
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
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/impact?districtId=${geography.districtId}&forecastId=${district.forecastId}&scenario=P50`}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 transition hover:brightness-110"
            style={{
              background: "#C8FF3D",
              color: "#04121b",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Cpu size={12} /> SIMULATE 3D
          </Link>
          <Link
            href={`/reports?stateId=${geography.stateId}&districtId=${geography.districtId}`}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 transition hover:brightness-110"
            style={{
              background: "rgba(255,255,255,.12)",
              border: "1px solid rgba(255,255,255,.20)",
              color: "rgba(255,255,255,.85)",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <FileText size={12} /> BULLETIN
          </Link>
        </div>
      </div>
    </div>
  );
}


// ─── Main home page component ───────────────────────────────────
export default function HomePageClient() {
  const {
    selectedDistrictId,
    activeLeadHours,
    activeLayers,
    showAnimation,
    updateState,
    toggleLayer,
  } = useShareableState();

  const { forecasts } = useLiveForecast();
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const selectedDistrict = selectedDistrictId
    ? forecasts.find(
        (f) =>
          f.geography.districtId.toLowerCase() === selectedDistrictId.toLowerCase()
      ) || null
    : null;

  // Sort by correctedMm — top 5 most critical districts
  const topDistricts = [...forecasts]
    .sort((a, b) => b.rainfall.correctedMm - a.rainfall.correctedMm)
    .slice(0, 5);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100vh" }}>

      <div className="absolute inset-0 z-0">
        <Map
          activeLayers={activeLayers}
          selectedDistrictId={selectedDistrictId}
          onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
        >
          <OfficialBoundaryLayer />
          <AnimationOverlay isAnimationEnabled={showAnimation} activeLayers={activeLayers} />
          <RainfallLayer
            forecasts={forecasts}
            visible={activeLayers.includes("rainfall")}
            onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
          />
          <ProbabilityLayer forecasts={forecasts} visible={activeLayers.includes("heavyRainProbability")} />
          <RegimeLayer forecasts={forecasts} visible={activeLayers.includes("weatherRegime")} />
          <WindStreamLayer visible={activeLayers.includes("windStreamlines")} />
          <HazardMarkersLayer activeLayers={activeLayers} />
          <InfrastructureLayer visible={activeLayers.includes("roads")} />
        </Map>
      </div>

      {/* Layer panel — floats above the LAYERS button, z-40 so it's above everything */}
      {showLayerPanel && (
        <LayerControl
          activeLayers={activeLayers}
          onToggleLayer={toggleLayer}
          bottomOffset={130}
          leftOffset={16}
        />
      )}

      {/* Floating Layers button — sits above the timeline strip */}
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

      {/* ── TOP-LEFT: Command Hero ────────────────────────── */}
      {!selectedDistrict && (
        <div
          className="absolute z-20"
          style={{ left: 16, top: 40, maxWidth: 440, pointerEvents: "none" }}
        >
          {/* Status chip */}
          <div
            className="inline-flex items-center gap-2 mb-4 animate-wipe-right"
            style={{
              padding: "4px 14px",
              borderRadius: 999,
              background: "rgba(200,255,61,.14)",
              border: "1px solid rgba(200,255,61,.35)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <span
              className="animate-radar-pulse inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#C8FF3D" }}
            />
            <span style={{ color: "#C8FF3D", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
              RAW ENSEMBLE · LIVE IMD/NWP 72H
            </span>
          </div>

          {/* Headline */}
          <div style={{ overflow: "hidden" }}>
            <h1
              className="animate-line-up"
              style={{
                fontFamily: "'Inter Tight', Inter, sans-serif",
                fontWeight: 500,
                fontSize: 52,
                lineHeight: 1.1,
                color: "#ffffff",
                letterSpacing: "-0.5px",
                marginBottom: 8,
                textShadow: "0 2px 20px rgba(4,18,27,.60)",
              }}
            >
              INDIA RAINFALL{"\n"}INTELLIGENCE
            </h1>
          </div>

          <p
            className="animate-wipe-down"
            style={{
              color: "rgba(255,255,255,.75)",
              fontSize: 13,
              lineHeight: 1.6,
              maxWidth: 400,
              textShadow: "0 1px 8px rgba(4,18,27,.80)",
            }}
          >
            Regime-Aware AI Post-Processing &amp; 3D Rainfall-to-Impact Digital Twin for NDMA/SDMA emergency operations.
          </p>
        </div>
      )}

      {/* ── RIGHT: Glass Telemetry Rail — Top 5 Critical Districts ── */}
      {!selectedDistrict && (
        <div
          className="absolute z-20 flex flex-col gap-2"
          style={{ right: 16, top: 40, width: 292, maxHeight: "calc(100vh - 130px)", overflowY: "auto" }}
        >
          {/* Primary big card — #1 district */}
          {topDistricts[0] && (
            <div
              className="relative overflow-hidden p-4 cursor-pointer animate-slide-r"
              style={{ ...glassCard, borderRadius: 20 }}
              onClick={() => updateState({ selectedDistrictId: topDistricts[0].geography.districtId })}
            >
              <span
                className="absolute inset-0 pointer-events-none animate-sheen"
                style={{
                  width: "38%",
                  background: "linear-gradient(100deg,transparent 0%,rgba(255,255,255,.17) 50%,transparent 100%)",
                  transform: "skewX(-18deg)",
                }}
              />
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p style={{ color: "rgba(255,255,255,.55)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                    {topDistricts[0].geography.stateName}
                  </p>
                  <p style={{ color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
                    {topDistricts[0].geography.districtName}
                  </p>
                </div>
                <span
                  style={{
                    padding: "2px 8px", borderRadius: 999,
                    background: alertColor(topDistricts[0].rainfall.alertLevel).bg,
                    border: `1px solid ${alertColor(topDistricts[0].rainfall.alertLevel).border}`,
                    color: alertColor(topDistricts[0].rainfall.alertLevel).text,
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                  }}
                >
                  {topDistricts[0].rainfall.alertLevel}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "'Inter Tight', Inter, sans-serif",
                  fontWeight: 500, fontSize: 60, lineHeight: 1,
                  color: "#ffffff", letterSpacing: "-3px", margin: "8px 0 6px",
                }}
              >
                {topDistricts[0].rainfall.correctedMm.toFixed(0)}
                <span style={{ fontSize: 26, verticalAlign: "super", marginLeft: 4, color: "rgba(255,255,255,.65)" }}>mm</span>
              </div>
              <div className="flex justify-between pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,.15)" }}>
                {[
                  { label: "P10", val: topDistricts[0].rainfall.p10Mm },
                  { label: "P50", val: topDistricts[0].rainfall.p50Mm },
                  { label: "P90", val: topDistricts[0].rainfall.p90Mm },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <span style={{ color: "#ffffff", fontSize: 11, fontWeight: 600 }}>{(val ?? 0).toFixed(0)}mm</span>
                    <span style={{ color: "rgba(255,255,255,.45)", fontSize: 9, letterSpacing: "0.08em" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact row cards — districts #2 to #5 */}
          {topDistricts.slice(1).map((d) => {
            const ac = alertColor(d.rainfall.alertLevel);
            return (
              <div
                key={d.geography.districtId}
                className="flex items-center justify-between px-4 cursor-pointer animate-slide-r hover:brightness-110 transition"
                style={{ ...glassCard, borderRadius: 14, height: 66 }}
                onClick={() => updateState({ selectedDistrictId: d.geography.districtId })}
              >
                <div>
                  <p style={{ color: "rgba(255,255,255,.45)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {d.geography.stateName}
                  </p>
                  <p style={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{d.geography.districtName}</p>
                  <span
                    style={{
                      marginTop: 2, display: "inline-block",
                      fontSize: 9, padding: "1px 6px",
                      background: ac.bg, border: `1px solid ${ac.border}`,
                      borderRadius: 999, color: ac.text, fontWeight: 700,
                    }}
                  >
                    {d.rainfall.alertLevel}
                  </span>
                </div>
                <div className="flex items-end gap-0.5">
                  <span style={{ fontFamily: "'Inter Tight', Inter, sans-serif", fontWeight: 500, fontSize: 26, color: "#ffffff", letterSpacing: "-1px" }}>
                    {d.rainfall.correctedMm.toFixed(0)}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.55)", marginBottom: 2 }}>mm</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fix #3: District detail panel — full Aurora glass, animated ──── */}
      {selectedDistrict && (
        <div
          className="absolute z-30"
          style={{ right: 16, top: 40, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}
        >
          <DistrictDetailPanel
            district={selectedDistrict}
            onClose={() => updateState({ selectedDistrictId: null })}
          />
        </div>
      )}

      {/* When district selected: show district name on left */}
      {selectedDistrict && (
        <div className="absolute z-20" style={{ left: 16, top: 40, maxWidth: 420, pointerEvents: "none" }}>
          <div
            className="inline-flex items-center gap-2 mb-4 animate-wipe-right"
            style={{
              padding: "4px 14px", borderRadius: 999,
              background: alertColor(selectedDistrict.rainfall.alertLevel).bg,
              border: `1px solid ${alertColor(selectedDistrict.rainfall.alertLevel).border}`,
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            }}
          >
            <span className="animate-radar-pulse inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: alertColor(selectedDistrict.rainfall.alertLevel).text }} />
            <span style={{ color: alertColor(selectedDistrict.rainfall.alertLevel).text, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>
              {selectedDistrict.rainfall.alertLevel} ALERT · {selectedDistrict.geography.stateName.toUpperCase()}
            </span>
          </div>
          <div style={{ overflow: "hidden" }}>
            <h1 className="animate-line-up" style={{
              fontFamily: "'Inter Tight', Inter, sans-serif",
              fontWeight: 500, fontSize: 52, lineHeight: 1.1,
              color: "#ffffff", letterSpacing: "-0.5px",
              textShadow: "0 2px 20px rgba(4,18,27,.60)",
            }}>
              {selectedDistrict.geography.districtName}
            </h1>
          </div>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 13, marginTop: 6 }}>
            {selectedDistrict.geography.stateName} · AI Corrected: {selectedDistrict.rainfall.correctedMm.toFixed(1)} mm
          </p>
        </div>
      )}

      {/* ── BOTTOM: Timeline Strip — leave 72px right gap for chatbot ── */}
      <div className="absolute z-20" style={{ left: 16, right: 80, bottom: 16 }}>
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



