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
    <div className="absolute top-20 right-4 bottom-24 z-20 flex select-none pointer-events-none">
      
      {/* Toggle button on side */}
      <div className="flex items-start pt-2 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-graphite-900/90 backdrop-blur border border-graphite-800 clipped-tl p-2.5 text-paper-dim hover:text-white shadow-xl hover:bg-graphite-800 transition"
          title={isOpen ? "Collapse Analytics Panel" : "Expand Analytics Panel"}
        >
          {isOpen ? <ChevronRight className="w-5 h-5 text-chartreuse" /> : <ChevronLeft className="w-5 h-5 text-chartreuse" />}
        </button>
      </div>

      {/* Main Slide-in Panel */}
      {isOpen && (
        <div className="w-96 bg-graphite-950/95 backdrop-blur-xl border border-graphite-800 clipped-br shadow-2xl flex flex-col overflow-hidden pointer-events-auto transition-all">
          
          {/* Header & Tabs */}
          <div className="p-3 bg-graphite-900/70 border-b border-graphite-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 clipped-both bg-chartreuse animate-pulse" />
                <h2 className="text-xs font-bold font-mono tracking-wider text-warm-paper uppercase">
                  Impact Intelligence Feed
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 clipped-both bg-graphite-800 text-chartreuse border border-graphite-800">
                {currentState.timestamp}
              </span>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 bg-graphite-900/90 p-1 clipped-br border border-graphite-800 text-xs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-1.5 clipped-br font-medium transition flex flex-col items-center gap-0.5 ${
                  activeTab === "overview" ? "bg-graphite-800 text-chartreuse font-bold shadow-sm" : "text-smoke hover:text-warm-paper"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("exposure")}
                className={`py-1.5 clipped-br font-medium transition flex flex-col items-center gap-0.5 ${
                  activeTab === "exposure" ? "bg-graphite-800 text-chartreuse font-bold shadow-sm" : "text-smoke hover:text-warm-paper"
                }`}
              >
                <Hospital className="w-3.5 h-3.5" />
                <span className="text-[10px]">Exposure</span>
              </button>

              <button
                onClick={() => setActiveTab("warnings")}
                className={`py-1.5 clipped-br font-medium transition flex flex-col items-center gap-0.5 relative ${
                  activeTab === "warnings" ? "bg-graphite-800 text-chartreuse font-bold shadow-sm" : "text-smoke hover:text-warm-paper"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-[10px]">Warnings</span>
                {warnings.length > 0 && (
                  <span className="absolute top-1 right-2 w-2 h-2 clipped-both bg-signal-red animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab("comparison")}
                className={`py-1.5 clipped-br font-medium transition flex flex-col items-center gap-0.5 ${
                  activeTab === "comparison" ? "bg-graphite-800 text-chartreuse font-bold shadow-sm" : "text-smoke hover:text-warm-paper"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span className="text-[10px]">Matrix</span>
              </button>
            </div>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs text-paper-dim custom-scrollbar">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-3">
                {/* Metric Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 clipped-br bg-graphite-900/60 border border-graphite-800 flex flex-col">
                    <span className="text-[10px] font-mono text-smoke uppercase">Max Flood Depth</span>
                    <div className="text-lg font-bold font-mono text-chartreuse mt-1">
                      {currentState.water.max_depth_m.toFixed(2)} <span className="text-xs font-normal">m</span>
                    </div>
                    <span className="text-[10px] text-smoke">Low-lying depression</span>
                  </div>

                  <div className="p-2.5 clipped-br bg-graphite-900/60 border border-graphite-800 flex flex-col">
                    <span className="text-[10px] font-mono text-smoke uppercase">Inundated Area</span>
                    <div className="text-lg font-bold font-mono text-warm-paper mt-1">
                      {currentState.water.inundated_area_km2.toFixed(2)} <span className="text-xs font-normal">km²</span>
                    </div>
                    <span className="text-[10px] text-smoke">Surface water footprint</span>
                  </div>

                  <div className="p-2.5 clipped-br bg-graphite-900/60 border border-graphite-800 flex flex-col">
                    <span className="text-[10px] font-mono text-smoke uppercase">Congestion Index</span>
                    <div className="text-lg font-bold font-mono text-amber mt-1 flex items-center gap-1">
                      <span>{currentState.congestion.congestion_score.toFixed(0)}</span>
                      <span className="text-xs font-normal text-smoke">/ 100</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${
                      currentState.congestion.severity === "CRITICAL" ? "text-signal-red" : "text-amber"
                    }`}>
                      {currentState.congestion.severity} RISK
                    </span>
                  </div>

                  <div className="p-2.5 clipped-br bg-graphite-900/60 border border-graphite-800 flex flex-col">
                    <span className="text-[10px] font-mono text-smoke uppercase">Exposed Residents</span>
                    <div className="text-lg font-bold font-mono text-violet mt-1">
                      {popData.estimated_total_population_exposure.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-smoke">Ward buffer model</span>
                  </div>
                </div>

                {/* Traffic Disruption Card */}
                <div className="p-3 clipped-br bg-graphite-900/60 border border-graphite-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-warm-paper flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-amber" />
                      Arterial Road Impedance
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 clipped-br bg-graphite-800 text-smoke">
                      {currentState.roads.bottlenecks.length} Chokepoints
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {roads.map(r => (
                      <div
                        key={r.road_id}
                        onClick={() => onSelectEntity && onSelectEntity({ type: "road", data: r })}
                        className="p-2 clipped-br bg-graphite-950 hover:bg-graphite-800/80 border border-graphite-800/80 cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="flex-1 pr-2">
                          <div className="font-semibold text-warm-paper truncate">{r.name}</div>
                          <div className="text-[10px] font-mono text-smoke flex items-center gap-2 mt-0.5">
                            <span>Depth: <strong className="text-chartreuse">{r.water_depth_m.toFixed(2)}m</strong></span>
                            <span>Cap Loss: <strong className="text-signal-red">-{r.speed_reduction_pct.toFixed(0)}%</strong></span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 clipped-br text-[9px] font-bold font-mono uppercase ${
                          r.severity === "CRITICAL" ? "bg-signal-red/20 text-signal-red border border-signal-red/30" :
                          r.severity === "HIGH" ? "bg-amber/20 text-amber border border-amber/30" :
                          r.severity === "WATCH" ? "bg-amber/20 text-amber border border-amber-500/30" :
                          "bg-chartreuse/20 text-chartreuse"
                        }`}>
                          {r.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Storm Drainage Utilization */}
                <div className="p-3 clipped-br bg-graphite-900/60 border border-graphite-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-warm-paper flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-chartreuse" />
                      Storm Drainage Surcharge
                    </span>
                    <span className="font-mono text-[10px] text-chartreuse">
                      Peak Util: {(currentState.drainage.max_utilization * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-graphite-800 clipped-both h-2 mb-2 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, currentState.drainage.max_utilization * 80)}%` }}
                      className={`h-full clipped-both transition-all duration-300 ${
                        currentState.drainage.max_utilization >= 1.05 ? "bg-signal-red" :
                        currentState.drainage.max_utilization >= 0.90 ? "bg-amber" :
                        "bg-chartreuse"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-smoke leading-relaxed">
                    {currentState.drainage.max_utilization >= 1.05
                      ? "Critical backwater surcharge: Primary culverts exceeding outfall destination capacity."
                      : "Trunk culverts operating within calibrated gravity flow envelope."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: EXPOSURE */}
            {activeTab === "exposure" && (
              <div className="space-y-3">
                {/* Hospital Access Status */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-warm-paper flex items-center gap-1.5">
                    <Hospital className="w-4 h-4 text-signal-red" />
                    Hospital Ingress & Feeder Status
                  </span>

                  {hospitals.map(h => (
                    <div
                      key={h.facility_id}
                      onClick={() => onSelectEntity && onSelectEntity({ type: "facility", data: h })}
                      className="p-2.5 clipped-br bg-graphite-900/80 border border-graphite-800 hover:bg-graphite-800 hover:border-graphite-800 cursor-pointer transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-warm-paper">{h.name}</div>
                          <span className="text-[10px] font-mono text-smoke">{h.type}</span>
                        </div>
                        <span className={`px-2 py-0.5 clipped-br text-[9px] font-bold font-mono ${
                          h.access_risk_level === "CRITICAL" ? "bg-signal-red/20 text-signal-red border border-signal-red/30 animate-pulse" :
                          h.access_risk_level === "HIGH" ? "bg-amber/20 text-amber border border-amber/30" :
                          "bg-chartreuse/20 text-chartreuse"
                        }`}>
                          {h.access_risk_level}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-graphite-800/60 font-mono text-[10px]">
                        <div>
                          <span className="text-smoke">Compound Depth:</span>
                          <div className="font-bold text-warm-paper">{h.direct_depth_m?.toFixed(2) || "0.00"} m</div>
                        </div>
                        <div>
                          <span className="text-smoke">Feeder Route Depth:</span>
                          <div className="font-bold text-amber-300">{h.access_route_depth_m?.toFixed(2) || "0.00"} m</div>
                        </div>
                      </div>

                      <div className="mt-1.5 text-[10px] text-smoke">
                        Status: <strong className="text-paper-dim">{h.status?.replace(/_/g, " ")}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ward Population Breakdown */}
                <div className="p-3 clipped-br bg-graphite-900/60 border border-graphite-800 space-y-2">
                  <span className="text-xs font-bold text-warm-paper flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet" />
                    Ward Population Exposure
                  </span>

                  <div className="space-y-1.5">
                    {popData.ward_breakdown?.map((wb: any) => (
                      <div key={wb.ward} className="p-2 clipped-br bg-graphite-950 border border-graphite-800/80 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-warm-paper">{wb.ward}</div>
                          <div className="text-[10px] font-mono text-smoke">
                            Mean Depth: {wb.representative_water_depth_m}m
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-bold text-violet">{wb.estimated_exposed_population.toLocaleString()}</div>
                          <span className="text-[9px] text-smoke uppercase">residents</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: WARNINGS */}
            {activeTab === "warnings" && (
              <div className="space-y-2.5">
                {/* Filter Chips */}
                <div className="flex gap-1 bg-graphite-900 p-1 clipped-br border border-graphite-800 text-[10px] font-mono">
                  {(["ALL", "CRITICAL", "HIGH", "WATCH"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setWarningFilter(f)}
                      className={`flex-1 py-1 clipped-br font-semibold transition ${
                        warningFilter === f ? "bg-graphite-800 text-white" : "text-smoke hover:text-warm-paper"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Warnings List */}
                {filteredWarnings.length === 0 ? (
                  <div className="p-6 text-center text-smoke">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50 text-chartreuse" />
                    <p>No active warnings under this criteria.</p>
                  </div>
                ) : (
                  filteredWarnings.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => onSelectEntity && onSelectEntity({ type: "warning", data: w })}
                      className="p-3 clipped-br bg-graphite-900/80 border border-graphite-800 hover:border-graphite-800 cursor-pointer transition space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 clipped-br text-[9px] font-bold font-mono uppercase ${
                          w.severity === "CRITICAL" ? "bg-signal-red/20 text-signal-red border border-signal-red/40" :
                          w.severity === "HIGH" ? "bg-amber/20 text-amber border border-amber/40" :
                          "bg-amber/20 text-amber border border-amber-500/40"
                        }`}>
                          {w.severity}
                        </span>
                        <span className="text-[10px] font-mono text-smoke">{w.timestamp}</span>
                      </div>

                      <div className="font-bold text-warm-paper">{w.title}</div>
                      <p className="text-[11px] text-paper-dim leading-relaxed">{w.message}</p>

                      {w.location && (
                        <div className="text-[10px] font-mono text-chartreuse pt-1 flex items-center gap-1">
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
                <div className="space-y-3">
                  <div className="p-3 clipped-br bg-graphite-900/80 border border-graphite-800">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-warm-paper">Scenario Comparison Matrix</h3>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 clipped-br font-bold ${
                        hasLiveComp 
                          ? "bg-chartreuse/20 text-chartreuse border border-chartreuse/40"
                          : "bg-amber/20 text-amber border border-amber/40"
                      }`}>
                        {hasLiveComp ? "LIVE SIMULATION" : "DEMO / OFFLINE FALLBACK"}
                      </span>
                    </div>
                    <p className="text-[11px] text-smoke mb-3">
                      {hasLiveComp 
                        ? "Evaluated natively by the physical impact engine across deterministic scenario envelopes."
                        : "Static demonstrative figures shown for offline testing. Start ML & Impact services for live simulation."}
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead>
                          <tr className="border-b border-graphite-800 text-smoke">
                            <th className="text-left py-1">Scenario</th>
                            <th className="text-center py-1">Rain</th>
                            <th className="text-center py-1">Depth</th>
                            <th className="text-center py-1">Bottlenecks</th>
                            <th className="text-right py-1">Pop</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-graphite-800/50">
                          {rows.map((r: any, idx: number) => {
                            const scName = r.scenario || (idx === 0 ? "LOW" : idx === 1 ? "BASE" : "HIGH");
                            const isHigh = scName.includes("HIGH") || scName.includes("P90");
                            const isBase = scName.includes("BASE") || scName.includes("P50");
                            return (
                              <tr key={scName} className={`hover:bg-graphite-800/40 ${isHigh ? "bg-signal-red/10" : ""}`}>
                                <td className={`py-1.5 font-bold ${isHigh ? "text-signal-red" : isBase ? "text-amber" : "text-chartreuse"}`}>
                                  {scName}
                                </td>
                                <td className="text-center text-paper-dim">
                                  {Number(r.rainfall_mm).toFixed(1)} mm
                                </td>
                                <td className={`text-center font-bold ${isHigh ? "text-chartreuse" : "text-paper-dim"}`}>
                                  {Number(r.peak_water_depth_m).toFixed(2)} m
                                </td>
                                <td className={`text-center font-bold ${isHigh ? "text-signal-red" : "text-paper-dim"}`}>
                                  {r.road_bottlenecks || r.drainage_overflow_zones || 0}
                                </td>
                                <td className={`text-right font-bold ${isHigh ? "text-violet" : "text-paper-dim"}`}>
                                  {Number(r.population_exposed).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="p-3 clipped-br bg-graphite-900/40 border border-graphite-800 text-[11px] text-smoke space-y-1">
                    <div className="font-bold text-warm-paper">Hydrological Validation</div>
                    <p>Infiltration decay follows Horton curve; surface runoff routed via D8 steepest descent.</p>
                  </div>
                </div>
              );
            })()}

          </div>

        </div>
      )}

    </div>
  );
};
