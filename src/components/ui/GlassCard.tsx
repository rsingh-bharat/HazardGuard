import React from "react";
import { cn } from "@/lib/utils";

type GlassCardSize = "sm" | "md" | "lg";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  size?: GlassCardSize;
  sheen?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const RADIUS: Record<GlassCardSize, number> = { sm: 14, md: 18, lg: 24 };
const BLUR:   Record<GlassCardSize, number> = { sm: 14, md: 20, lg: 26 };

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  size = "md",
  sheen = false,
  style,
  onClick,
}) => (
  <div
    className={cn("relative overflow-hidden", className)}
    style={{
      background:
        "linear-gradient(180deg,rgba(255,255,255,.20) 0%,rgba(255,255,255,.258) 24%,rgba(255,255,255,.252) 78%,rgba(255,255,255,.232) 100%)",
      backdropFilter: `blur(${BLUR[size]}px) saturate(118%)`,
      WebkitBackdropFilter: `blur(${BLUR[size]}px) saturate(118%)`,
      border: "1px solid rgba(255,255,255,.20)",
      borderRadius: RADIUS[size],
      ...style,
    }}
    onClick={onClick}
  >
    {children}
    {sheen && (
      <span
        aria-hidden
        className="absolute inset-0 pointer-events-none animate-sheen"
        style={{
          width: "38%",
          background:
            "linear-gradient(100deg,transparent 0%,rgba(255,255,255,.17) 50%,transparent 100%)",
          transform: "skewX(-18deg)",
        }}
      />
    )}
  </div>
);
