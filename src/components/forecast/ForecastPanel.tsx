"use client";

import React from "react";
import { ForecastSnapshot } from "@/lib/contracts/forecast";
import { DistrictForecast } from "./DistrictForecast";
import { NationalSummary } from "./NationalSummary";
import { TimelinePlayer } from "./TimelinePlayer";

interface ForecastPanelProps {
  forecasts: ForecastSnapshot[];
  selectedDistrict: ForecastSnapshot | null;
  activeLeadHours: 0 | 6 | 12 | 24 | 48 | 72;
  onSelectDistrict: (districtId: string) => void;
  onClearDistrict: () => void;
  onSelectLeadHours: (leadHours: 0 | 6 | 12 | 24 | 48 | 72) => void;
}

export const ForecastPanel: React.FC<ForecastPanelProps> = ({
  forecasts,
  selectedDistrict,
  activeLeadHours,
  onSelectDistrict,
  onClearDistrict,
  onSelectLeadHours,
}) => (
  <div
    className="flex flex-col h-full overflow-hidden"
    style={{
      background:
        "linear-gradient(180deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.085) 100%)",
      backdropFilter: "blur(20px) saturate(115%)",
      WebkitBackdropFilter: "blur(20px) saturate(115%)",
      borderLeft: "1px solid rgba(255,255,255,.15)",
    }}
  >
    <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar">
      {selectedDistrict ? (
        <DistrictForecast district={selectedDistrict} onBack={onClearDistrict} />
      ) : (
        <NationalSummary forecasts={forecasts} onSelectDistrict={onSelectDistrict} />
      )}
    </div>

    <div
      className="p-3"
      style={{ borderTop: "1px solid rgba(255,255,255,.12)" }}
    >
      <TimelinePlayer
        activeLeadHours={activeLeadHours}
        onSelectLeadHours={onSelectLeadHours}
      />
    </div>
  </div>
);
