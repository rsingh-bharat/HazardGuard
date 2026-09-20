import React from "react";
import { Loader2 } from "lucide-react";

type BadgeStatus = "live" | "raw" | "processing" | "unavailable" | "demo" | "simulation" | "corrected";

const CONFIG: Record<BadgeStatus, { bg: string; border: string; color: string; label: string; pulse?: boolean; spin?: boolean }> = {
  live:        { bg: "rgba(200,255,61,.14)", border: "rgba(200,255,61,.35)", color: "#C8FF3D",   label: "LIVE",          pulse: true },
  raw:         { bg: "rgba(255,179,71,.14)", border: "rgba(255,179,71,.35)", color: "#FFB347",   label: "RAW ENSEMBLE" },
  processing:  { bg: "rgba(121,104,255,.14)",border: "rgba(121,104,255,.35)",color: "#7968FF",   label: "PROCESSING",    spin: true },
  unavailable: { bg: "rgba(255,59,48,.14)",  border: "rgba(255,59,48,.35)", color: "#FF3B30",   label: "UNAVAILABLE" },
  demo:        { bg: "rgba(255,255,255,.08)", border: "rgba(255,255,255,.18)",color: "rgba(255,255,255,.55)", label: "DEMO DATA" },
  simulation:  { bg: "rgba(200,255,61,.14)", border: "rgba(200,255,61,.35)", color: "#C8FF3D",   label: "SIMULATION" },
  corrected:   { bg: "rgba(100,180,255,.14)",border: "rgba(100,180,255,.35)",color: "#64B4FF",   label: "ML CORRECTED" },
};

interface GlassBadgeProps {
  status: BadgeStatus;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({ status, className, style }) => {
  const cfg = CONFIG[status];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 10px",
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        ...style,
      }}
    >
      {cfg.spin ? (
        <Loader2 size={9} className="animate-spin" />
      ) : (
        <span
          className={cfg.pulse ? "animate-radar-pulse" : ""}
          style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block", flexShrink: 0 }}
        />
      )}
      {cfg.label}
    </span>
  );
};
