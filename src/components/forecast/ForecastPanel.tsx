'use client';

import React from 'react';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { DistrictForecast } from './DistrictForecast';
import { NationalSummary } from './NationalSummary';
import { TimelinePlayer } from './TimelinePlayer';

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
}) => {
  return (
    <div className="flex flex-col h-full bg-graphite-950 border-l border-graphite-700 overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {selectedDistrict ? (
          <DistrictForecast district={selectedDistrict} onBack={onClearDistrict} />
        ) : (
          <NationalSummary forecasts={forecasts} onSelectDistrict={onSelectDistrict} />
        )}
      </div>

      {/* Sticky Bottom Timeline Player */}
      <div className="p-3 bg-graphite-950 border-t border-graphite-700">
        <TimelinePlayer
          activeLeadHours={activeLeadHours}
          onSelectLeadHours={onSelectLeadHours}
        />
      </div>
    </div>
  );
};
