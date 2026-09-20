"use client";

import React, { useEffect, useState } from "react";
import { Play, Pause, Clock } from "lucide-react";

interface TimelinePlayerProps {
  activeLeadHours: 0 | 6 | 12 | 24 | 48 | 72;
  onSelectLeadHours: (leadHours: 0 | 6 | 12 | 24 | 48 | 72) => void;
}

const LEAD_STEPS: Array<0 | 6 | 12 | 24 | 48 | 72> = [0, 6, 12, 24, 48, 72];

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  activeLeadHours,
  onSelectLeadHours,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        const currentIndex = LEAD_STEPS.indexOf(activeLeadHours);
        const nextIndex = (currentIndex + 1) % LEAD_STEPS.length;
        onSelectLeadHours(LEAD_STEPS[nextIndex]);
      }, 2000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isPlaying, activeLeadHours, onSelectLeadHours]);

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Header label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Clock size={13} style={{ color: "#C8FF3D" }} />
        <span style={{ color: "rgba(255,255,255,.65)", fontSize: 10, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" }}>
          72H CYCLE
        </span>
      </div>

      {/* Play/Pause */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="flex items-center justify-center shrink-0 transition-all hover:scale-105"
        title={isPlaying ? "Pause" : "Play 72h Timeline"}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: isPlaying ? "#FFB347" : "#C8FF3D",
          color: "#04121b",
          border: "none",
          cursor: "pointer",
          boxShadow: isPlaying
            ? "0 0 10px rgba(255,179,71,.40)"
            : "0 0 10px rgba(200,255,61,.40)",
        }}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
      </button>

      {/* Step buttons */}
      <div className="flex items-center gap-1 flex-1">
        {LEAD_STEPS.map((h) => {
          const isSelected = activeLeadHours === h;
          return (
            <button
              key={h}
              onClick={() => { setIsPlaying(false); onSelectLeadHours(h); }}
              className="flex-1 flex items-center justify-center transition-all duration-150 hover:brightness-110"
              style={{
                height: 32,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: isSelected ? 700 : 500,
                cursor: "pointer",
                background: isSelected ? "rgba(200,255,61,.20)" : "rgba(255,255,255,.06)",
                border: `1px solid ${isSelected ? "rgba(200,255,61,.50)" : "rgba(255,255,255,.12)"}`,
                color: isSelected ? "#C8FF3D" : "rgba(255,255,255,.60)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {h === 0 ? "NOW" : `+${h}H`}
            </button>
          );
        })}
      </div>

      {/* Active label */}
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 999,
          background: "rgba(200,255,61,.14)",
          border: "1px solid rgba(200,255,61,.35)",
          color: "#C8FF3D",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
          
        }}
      >
        T+{activeLeadHours}H
      </span>
    </div>
  );
};

