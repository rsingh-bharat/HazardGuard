import React, { useState } from "react";
import { 
  ImpactTimelineState, 
  ImpactSimulationResult, 
  SeverityLevel,
  RoadEvaluation,
  FacilityEvaluation
} from "@/lib/contracts/impact";
import { 
  BarChart3, 
  AlertTriangle, 
  Activity, 
  GitCompare, 
  ChevronRight, 
  ChevronLeft, 
  Hospital, 
  Car, 
  Users, 
  ShieldAlert, 
  Waves,
  ArrowUpRight
} from "lucide-react";

interface ImpactAnalyticsPanelProps {
  simulation: ImpactSimulationResult;
  currentState: ImpactTimelineState;
  onSelectEntity?: (entity: { type: string; data: any }) => void;
}

export const ImpactAnalyticsPanel: React.FC<ImpactAnalyticsPanelProps> = ({
  simulation,
  currentState,
  onSelectEntity
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "exposure" | "warnings" | "comparison">("overview");
  const [warningFilter, setWarningFilter] = useState<"ALL" | "CRITICAL" | "HIGH" | "WATCH">("ALL");

  const summary = simulation.summary;
  const warnings = currentState.warnings || [];
  const filteredWarnings = warningFilter === "ALL" 
    ? warnings 
    : warnings.filter(w => w.severity === warningFilter);

  const hospitals = currentState.exposure?.hospitals || [];
  const roads = currentState.roads?.road_evaluations || [];
  const popData = currentState.exposure?.population || { estimated_total_population_exposure: 0, ward_breakdown: [] };

  return (
    <div className="absolute top-[var(--impact-panel-top)] right-4 bottom-[var(--impact-panel-bottom)] z-20 flex select-none pointer-events-none items-start">
      
      {/* Toggle button on side (Minimized State) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto rounded-[20px] p-3 text-white/70 hover:text-white shadow-xl transition mr-2"
          style={{ background: "rgba(255,255,255,.15)", backdropFilter: "blur(16px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" }}
          title="Expand Analytics Panel"
        >
          <Activity className="w-5 h-5 text-[#C8FF3D]" />
        </button>
      )}

      {/* Main Slide-in Panel */}
      <div 
        className={`w-[380px] rounded-[24px] shadow-2xl flex flex-col pointer-events-auto transition-all h-full ${isOpen ? "opacity-100" : "w-0 opacity-0 border-none overflow-hidden"}`}
        style={isOpen ? { background: "linear-gradient(180deg, rgba(255,255,255,.125) 0%, rgba(255,255,255,.135) 13%, rgba(255,255,255,.098) 34%, rgba(255,255,255,.092) 100%)", backdropFilter: "blur(18px) saturate(115%)", WebkitBackdropFilter: "blur(18px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" } : {}}
      >
        
        {/* Header & Tabs */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#C8FF3D] animate-pulse" />
              <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Impact Intelligence Feed
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm text-[#C8FF3D] border border-white/10">
                {currentState.timestamp}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white hover:text-[#C8FF3D] border border-transparent hover:border-white/10 transition flex items-center justify-center bg-white/5"
                title="Hide analytics panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl border border-white/10 text-xs bg-white/5">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-1.5 rounded-xl font-medium transition flex flex-col items-center gap-0.5 ${
                  activeTab === "overview" ? "text-[#C8FF3D] font-bold shadow-sm bg-white/10" : "text-white/50 hover:text-white"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("exposure")}
                className={`py-1.5 rounded-xl font-medium transition flex flex-col items-center gap-0.5 ${
                  activeTab === "exposure" ? "text-[#C8FF3D] font-bold shadow-sm bg-white/10" : "text-white/50 hover:text-white"
                }`}
              >
                <Hospital className="w-3.5 h-3.5" />
                <span className="text-[10px]">Exposure</span>
              </button>

              <button
                onClick={() => setActiveTab("warnings")}
                className={`py-1.5 rounded-xl font-medium transition flex flex-col items-center gap-0.5 relative ${
                  activeTab === "warnings" ? "text-[#C8FF3D] font-bold shadow-sm bg-white/10" : "text-white/50 hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px]">Warnings</span>
                {warnings.length > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-sm bg-[#FF3B30] animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("comparison")}
                className={`py-1.5 rounded-xl font-medium transition flex flex-col items-center gap-0.5 ${
                  activeTab === "comparison" ? "text-[#C8FF3D] font-bold shadow-sm bg-white/10" : "text-white/50 hover:text-white"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span className="text-[10px]">Matrix</span>
              </button>
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-white/80 custom-scrollbar relative">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* Metric Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-white/10 flex flex-col bg-white/5">
                    <span className="text-[10px] font-mono text-white/50 uppercase">Max Flood Depth</span>
                    <div className="text-lg font-bold font-mono text-[#C8FF3D] mt-1">
                      {currentState.water.max_depth_m.toFixed(2)} <span className="text-xs font-normal">m</span>
                    </div>
                    <span className="text-[10px] text-white/50">Low-lying depression</span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 flex flex-col bg-white/5">
                    <span className="text-[10px] font-mono text-white/50 uppercase">Inundated Area</span>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {currentState.water.inundated_area_km2.toFixed(2)} <span className="text-xs font-normal">km²</span>
                    </div>
                    <span className="text-[10px] text-white/50">Surface water footprint</span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 flex flex-col bg-white/5">
                    <span className="text-[10px] font-mono text-white/50 uppercase">Congestion Index</span>
                    <div className="text-lg font-bold font-mono text-[#FFB347] mt-1 flex items-center gap-1">
                      <span>{currentState.congestion.congestion_score.toFixed(0)}</span>
                      <span className="text-xs font-normal text-white/50">/ 100</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${
                      currentState.congestion.severity === "CRITICAL" ? "text-[#FF3B30]" : "text-[#FFB347]"
                    }`}>
                      {currentState.congestion.severity} RISK
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 flex flex-col bg-white/5">
                    <span className="text-[10px] font-mono text-white/50 uppercase">Exposed Residents</span>
                    <div className="text-lg font-bold font-mono text-violet-400 mt-1">
                      {popData.estimated_total_population_exposure.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-white/50">Ward buffer model</span>
                  </div>
                </div>

                {/* Traffic Disruption Card */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-[#FFB347]" />
                      Arterial Road Impedance
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-xl text-white/50 bg-white/10">
                      {currentState.roads.bottlenecks.length} Chokepoints
                    </span>
                  </div>

                  <div className="space-y-2">
                    {roads.map(r => (
                      <div
                        key={r.road_id}
                        onClick={() => onSelectEntity && onSelectEntity({ type: "road", data: r })}
                        className="p-2.5 rounded-xl hover:bg-white/10 border border-white/10 cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <div className="font-semibold text-white truncate">{r.name}</div>
                          <div className="text-[10px] font-mono text-white/50 flex items-center gap-2 mt-1">
                            <span>Depth: <strong className="text-[#C8FF3D]">{r.water_depth_m.toFixed(2)}m</strong></span>
                            <span>Cap Loss: <strong className="text-[#FF3B30]">-{r.speed_reduction_pct.toFixed(0)}%</strong></span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-xl text-[9px] font-bold font-mono uppercase ${
                          r.severity === "CRITICAL" ? "bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30" :
                          r.severity === "HIGH" ? "bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/30" :
                          r.severity === "WATCH" ? "bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/30" :
                          "bg-[#C8FF3D]/20 text-[#C8FF3D]"
                        }`}>
                          {r.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Storm Drainage Utilization */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-[#C8FF3D]" />
                      Storm Drainage Surcharge
                    </span>
                    <span className="font-mono text-[10px] text-[#C8FF3D]">
                      Peak Util: {(currentState.drainage.max_utilization * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full rounded-sm h-2 mb-2 overflow-hidden bg-white/10">
                    <div
                      style={{ width: `${Math.min(100, currentState.drainage.max_utilization * 80)}%` }}
                      className={`h-full rounded-sm transition-all duration-300 ${
                        currentState.drainage.max_utilization >= 1.05 ? "bg-[#FF3B30]" :
                        currentState.drainage.max_utilization >= 0.90 ? "bg-[#FFB347]" :
                        "bg-[#C8FF3D]"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    {currentState.drainage.max_utilization >= 1.05
                      ? "Critical backwater surcharge: Primary culverts exceeding outfall destination capacity."
                      : "Trunk culverts operating within calibrated gravity flow envelope."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: EXPOSURE */}
            {activeTab === "exposure" && (
              <div className="space-y-4">
                {/* Hospital Access Status */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Hospital className="w-4 h-4 text-[#FF3B30]" />
                    Hospital Ingress & Feeder Status
                  </span>

                  {hospitals.map(h => (
                    <div
                      key={h.facility_id}
                      onClick={() => onSelectEntity && onSelectEntity({ type: "facility", data: h })}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-white">{h.name}</div>
                          <span className="text-[10px] font-mono text-white/50">{h.type}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-xl text-[9px] font-bold font-mono ${
                          h.access_risk_level === "CRITICAL" ? "bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/30 animate-pulse" :
                          h.access_risk_level === "HIGH" ? "bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/30" :
                          "bg-[#C8FF3D]/20 text-[#C8FF3D]"
                        }`}>
                          {h.access_risk_level}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-white/10 font-mono text-[10px]">
                        <div>
                          <span className="text-white/50">Compound Depth:</span>
                          <div className="font-bold text-white">{h.direct_depth_m?.toFixed(2) || "0.00"} m</div>
                        </div>
                        <div>
                          <span className="text-white/50">Feeder Route Depth:</span>
                          <div className="font-bold text-[#FFB347]">{h.access_route_depth_m?.toFixed(2) || "0.00"} m</div>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-white/50">
                        Status: <strong className="text-white/80">{h.status?.replace(/_/g, " ")}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ward Population Breakdown */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-400" />
                    Ward Population Exposure
                  </span>

                  <div className="space-y-2">
                    {popData.ward_breakdown?.map((wb: any) => (
                      <div key={wb.ward} className="p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{wb.ward}</div>
                          <div className="text-[10px] font-mono text-white/50">
                            Mean Depth: {wb.representative_water_depth_m}m
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-bold text-violet-400">{wb.estimated_exposed_population.toLocaleString()}</div>
                          <span className="text-[9px] text-white/50 uppercase">residents</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WARNINGS */}
            {activeTab === "warnings" && (
              <div className="space-y-3">
                {/* Filter Chips */}
                <div className="flex gap-1 p-1 rounded-xl border border-white/10 text-[10px] font-mono bg-white/5">
                  {(["ALL", "CRITICAL", "HIGH", "WATCH"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setWarningFilter(f)}
                      className={`flex-1 py-1.5 rounded-xl font-semibold transition ${
                        warningFilter === f ? "text-white bg-white/10 shadow-sm" : "text-white/50 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Warnings List */}
                {filteredWarnings.length === 0 ? (
                  <div className="p-8 text-center text-white/50">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-3 opacity-50 text-[#C8FF3D]" />
                    <p>No active warnings under this criteria.</p>
                  </div>
                ) : (
                  filteredWarnings.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => onSelectEntity && onSelectEntity({ type: "warning", data: w })}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 cursor-pointer transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-1 rounded-xl text-[9px] font-bold font-mono uppercase ${
                          w.severity === "CRITICAL" ? "bg-[#FF3B30]/20 text-[#FF3B30] border border-[#FF3B30]/40" :
                          w.severity === "HIGH" ? "bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/40" :
                          "bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/40"
                        }`}>
                          {w.severity}
                        </span>
                        <span className="text-[10px] font-mono text-white/50">{w.timestamp}</span>
                      </div>

                      <div className="font-bold text-white">{w.title}</div>
                      <p className="text-[11px] text-white/70 leading-relaxed">{w.message}</p>

                      {w.location && (
                        <div className="text-[10px] font-mono text-[#C8FF3D] pt-1.5 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>{w.location.name || "Target Location"}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: SCENARIO MATRIX */}
            {activeTab === "comparison" && (() => {
              const comp = simulation.comparison;
              const hasLiveComp = Boolean(comp && (comp.LOW || comp.P10));
              const rows = hasLiveComp ? [
                comp?.LOW || comp?.P10,
                comp?.BASE || comp?.P50,
                comp?.HIGH || comp?.P90
              ].filter(Boolean) : [
                { scenario: "LOW (Watch)", rainfall_mm: 35, peak_water_depth_m: 0.18, road_bottlenecks: 1, population_exposed: 38000, is_demo: true },
                { scenario: "BASE (High)", rainfall_mm: 85, peak_water_depth_m: 0.36, road_bottlenecks: 3, population_exposed: 92000, is_demo: true },
                { scenario: "HIGH (Critical)", rainfall_mm: 165, peak_water_depth_m: 0.65, road_bottlenecks: 5, population_exposed: 180975, is_demo: true },
              ];

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white">Scenario Comparison Matrix</h3>
                      <span className={`text-[9px] font-mono px-2 py-1 rounded-xl font-bold ${
                        hasLiveComp 
                          ? "bg-[#C8FF3D]/20 text-[#C8FF3D] border border-[#C8FF3D]/40"
                          : "bg-[#FFB347]/20 text-[#FFB347] border border-[#FFB347]/40"
                      }`}>
                        {hasLiveComp ? "LIVE SIMULATION" : "DEMO / OFFLINE"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 mb-4">
                      {hasLiveComp 
                        ? "Evaluated natively by the physical impact engine across deterministic scenario envelopes."
                        : "Static demonstrative figures shown for offline testing. Start ML & Impact services for live simulation."}
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead>
                          <tr className="border-b border-white/10 text-white/50">
                            <th className="text-left py-1.5">Scenario</th>
                            <th className="text-center py-1.5">Rain</th>
                            <th className="text-center py-1.5">Depth</th>
                            <th className="text-center py-1.5">Bottlenecks</th>
                            <th className="text-right py-1.5">Pop</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {rows.map((r: any, idx: number) => {
                            const scName = r.scenario || (idx === 0 ? "LOW" : idx === 1 ? "BASE" : "HIGH");
                            const isHigh = scName.includes("HIGH") || scName.includes("P90");
                            const isBase = scName.includes("BASE") || scName.includes("P50");
                            return (
                              <tr key={scName} className={`hover:bg-white/5 ${isHigh ? "bg-[#FF3B30]/10" : ""}`}>
                                <td className={`py-2 font-bold ${isHigh ? "text-[#FF3B30]" : isBase ? "text-[#FFB347]" : "text-[#C8FF3D]"}`}>
                                  {scName}
                                </td>
                                <td className="text-center text-white/80">
                                  {Number(r.rainfall_mm).toFixed(1)} mm
                                </td>
                                <td className={`text-center font-bold ${isHigh ? "text-[#C8FF3D]" : "text-white/80"}`}>
                                  {Number(r.peak_water_depth_m).toFixed(2)} m
                                </td>
                                <td className={`text-center font-bold ${isHigh ? "text-[#FF3B30]" : "text-white/80"}`}>
                                  {r.road_bottlenecks || r.drainage_overflow_zones || 0}
                                </td>
                                <td className={`text-right font-bold ${isHigh ? "text-violet-400" : "text-white/80"}`}>
                                  {Number(r.population_exposed).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/50 space-y-1">
                    <div className="font-bold text-white">Hydrological Validation</div>
                    <p>Infiltration decay follows Horton curve; surface runoff routed via D8 steepest descent.</p>
                  </div>
                </div>
              );
            })()}

          </div>

      </div>

    </div>
  );
};
