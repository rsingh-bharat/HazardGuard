import React from "react";

type ChipColor = "default" | "green" | "red" | "amber" | "violet";

const BG: Record<ChipColor, string>     = {
  default: "rgba(255,255,255,.175)",
  green:   "rgba(200,255,61,.18)",
  red:     "rgba(255,59,48,.18)",
  amber:   "rgba(255,179,71,.18)",
  violet:  "rgba(121,104,255,.18)",
};
const BORDER: Record<ChipColor, string> = {
  default: "rgba(255,255,255,.20)",
  green:   "rgba(200,255,61,.40)",
  red:     "rgba(255,59,48,.35)",
  amber:   "rgba(255,179,71,.35)",
  violet:  "rgba(121,104,255,.35)",
};
const TEXT: Record<ChipColor, string>   = {
  default: "#ffffff",
  green:   "#C8FF3D",
  red:     "#FF3B30",
  amber:   "#FFB347",
  violet:  "#7968FF",
};

interface GlassChipProps {
  children: React.ReactNode;
  color?: ChipColor;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassChip: React.FC<GlassChipProps> = ({ children, color = "default", className, style }) => (
  <span
    className={className}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 12px",
      borderRadius: 999,
      background: BG[color],
      backdropFilter: "blur(16px) saturate(115%)",
      WebkitBackdropFilter: "blur(16px) saturate(115%)",
      border: `1px solid ${BORDER[color]}`,
      color: TEXT[color],
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.05em",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);
