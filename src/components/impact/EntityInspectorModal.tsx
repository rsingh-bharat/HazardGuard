import React from "react";
import { X, AlertCircle, Navigation, MapPin, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";

interface EntityInspectorModalProps {
  entity: { type: string; data: any } | null;
  onClose: () => void;
}

export const EntityInspectorModal: React.FC<EntityInspectorModalProps> = ({
  entity,
  onClose
}) => {
  if (!entity) return null;

  const { type, data } = entity;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg bg-graphite-900/95 backdrop-blur-xl border border-graphite-800/80 clipped-br shadow-2xl p-4 text-warm-paper select-none animate-scaleIn">
      <div className="flex items-start justify-between pb-3 border-b border-graphite-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 clipped-br bg-chartreuse/10 border border-chartreuse/30 text-chartreuse">
            {type === "facility" ? <Activity className="w-5 h-5" /> :
             type === "road" ? <Navigation className="w-5 h-5" /> :
             type === "drainage" ? <AlertCircle className="w-5 h-5" /> :
             <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-smoke">
              {type.toUpperCase()} INSPECTOR
            </span>
            <h3 className="text-base font-bold text-white">
              {data.name || data.title || "Selected Asset"}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 clipped-br hover:bg-graphite-800 text-smoke hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="py-3 space-y-3 text-xs">
        
        {/* ROAD DETAILS */}
        {type === "road" && (
          <>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 clipped-br bg-graphite-950 border border-graphite-800">
                <span className="text-[10px] text-smoke">Water Depth</span>
                <div className="text-base font-bold text-chartreuse">
                  {data.water_depth_m?.toFixed(2) || "0.00"} m
                </div>
              </div>

              <div className="p-2.5 clipped-br bg-graphite-950 border border-graphite-800">
                <span className="text-[10px] text-smoke">Capacity Loss</span>
                <div className="text-base font-bold text-signal-red">
                  -{data.speed_reduction_pct?.toFixed(0) || "0"}%
                </div>
              </div>
            </div>

            <div className="p-3 clipped-br bg-graphite-950 border border-graphite-800 space-y-1">
              <div className="text-smoke">Classification: <strong className="text-warm-paper">{data.road_type}</strong></div>
              <div className="text-smoke">Status: <strong className="text-amber-300">{data.status?.replace(/_/g, " ")}</strong></div>
              <div className="text-smoke">Severity: <strong className="text-signal-red">{data.severity}</strong></div>
            </div>

            <div className="p-3 clipped-br bg-blue-950/30 border border-blue-800/40 text-blue-200">
              <span className="font-bold flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-4 h-4 text-chartreuse" />
                Emergency Traffic Routing
              </span>
              <p className="text-[11px] leading-relaxed text-blue-300">
                {data.water_depth_m >= 0.35
                  ? "Arterial segment impassable for light passenger vehicles. Divert all non-emergency traffic through elevated grade separators."
                  : "High clearance emergency ambulances only. Free flow speed reduced by ~30%."}
              </p>
            </div>
          </>
        )}

        {/* FACILITY DETAILS */}
        {type === "facility" && (
          <>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 clipped-br bg-graphite-950 border border-graphite-800">
                <span className="text-[10px] text-smoke">Compound Depth</span>
                <div className="text-base font-bold text-chartreuse">
                  {data.direct_depth_m?.toFixed(2) || "0.00"} m
                </div>
              </div>

              <div className="p-2.5 clipped-br bg-graphite-950 border border-graphite-800">
                <span className="text-[10px] text-smoke">Connecting Feeder Depth</span>
                <div className="text-base font-bold text-amber">
                  {data.access_route_depth_m?.toFixed(2) || "0.00"} m
                </div>
              </div>
            </div>

            <div className="p-3 clipped-br bg-graphite-950 border border-graphite-800 space-y-1">
              <div className="text-smoke">Facility Type: <strong className="text-warm-paper">{data.type}</strong></div>
              <div className="text-smoke">Ingress Viability: <strong className="text-amber">{data.status?.replace(/_/g, " ")}</strong></div>
              <div className="text-smoke">Risk Hierarchy: <strong className="text-signal-red">{data.access_risk_level}</strong></div>
            </div>

            <div className="p-3 clipped-br bg-signal-red/20 border border-signal-red/40 text-signal-red">
              <span className="font-bold mb-1 block">Feeder Route Impedance Alert</span>
              <p className="text-[11px] leading-relaxed text-signal-red">
                Even if hospital compound plinth level is elevated, accessing feeder roads suffer severe standing water. Coordinate priority heavy-vehicle patient transport.
              </p>
            </div>
          </>
        )}

        {/* DRAINAGE DETAILS */}
        {type === "drainage" && (
          <>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-2.5 clipped-br bg-graphite-950 border border-graphite-800">
                <span className="text-[10px] text-smoke">Hydraulic Load</span>
                <div className="text-base font-bold text-chartreuse">
                  {((data.utilization || 0.7) * 100).toFixed(0)}%
                </div>
              </div>

              <div className="p-2.5 clipped-br bg-graphite-950 border border-graphite-800">
                <span className="text-[10px] text-smoke">Design Capacity</span>
                <div className="text-base font-bold text-warm-paper">
                  {data.capacity || "45.0"} m³/s
                </div>
              </div>
            </div>

            <div className="p-3 clipped-br bg-graphite-950 border border-graphite-800">
              <p className="text-[11px] text-paper-dim leading-relaxed">
                Stormwater trunk outfall discharging toward Bellandur basin. Backwater surcharge risk triggers manhole blowout when utilization crosses 105%.
              </p>
            </div>
          </>
        )}

        {/* WARNING DETAILS */}
        {type === "warning" && (
          <div className="space-y-2">
            <div className="p-3 clipped-br bg-graphite-950 border border-graphite-800">
              <div className="text-smoke text-[10px] font-mono uppercase">Trigger Details</div>
              <div className="text-warm-paper text-xs font-semibold mt-1">{data.message}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
