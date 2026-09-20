import React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "glass" | "primary" | "danger" | "ghost";
type ButtonSize    = "sm" | "md" | "lg";

const VARIANT_STYLE: Record<ButtonVariant, React.CSSProperties> = {
  glass: {
    background: "rgba(255,255,255,.175)",
    backdropFilter: "blur(16px) saturate(115%)",
    WebkitBackdropFilter: "blur(16px) saturate(115%)",
    border: "1px solid rgba(255,255,255,.20)",
    color: "#ffffff",
  },
  primary: {
    background: "#C8FF3D",
    border: "1px solid #C8FF3D",
    color: "#04121b",
    fontWeight: 600,
  },
  danger: {
    background: "rgba(255,59,48,.18)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,59,48,.35)",
    color: "#FF3B30",
  },
  ghost: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,.20)",
    color: "rgba(255,255,255,.80)",
  },
};

const SIZE_STYLE: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "4px 12px", fontSize: 11, borderRadius: 10 },
  md: { padding: "7px 18px", fontSize: 13, borderRadius: 12 },
  lg: { padding: "11px 24px", fontSize: 15, borderRadius: 14 },
};

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children, onClick, variant = "glass", size = "md", disabled, className, type = "button", style,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn("inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-95 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed", className)}
    style={{ ...VARIANT_STYLE[variant], ...SIZE_STYLE[size], cursor: disabled ? "not-allowed" : "pointer", ...style }}
  >
    {children}
  </button>
);
