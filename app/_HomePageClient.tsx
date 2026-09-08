'use client';

import React, { useState } from 'react';
import { Map } from '@/components/map/Map';
import { RainfallLayer } from '@/components/map/RainfallLayer';
import { ProbabilityLayer } from '@/components/map/ProbabilityLayer';
import { RegimeLayer } from '@/components/map/RegimeLayer';
import { WindStreamLayer } from '@/components/map/WindStreamLayer';
import { InfrastructureLayer } from '@/components/map/InfrastructureLayer';
import { HazardMarkersLayer } from '@/components/map/HazardMarkersLayer';
import { LayerControl } from '@/components/map/LayerControl';
import { ForecastPanel } from '@/components/forecast/ForecastPanel';
import { AnimationOverlay } from '@/components/map/AnimationOverlay';
import { useShareableState } from '@/lib/state/useShareableState';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import mockForecasts from '@/data/mock/forecast.json';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HomePageClient() {
  const {
    selectedDistrictId,
    activeLeadHours,
    activeLayers,
    showAnimation,
    updateState,
    toggleLayer,
  } = useShareableState();

  const [forecasts, setForecasts] = useState<ForecastSnapshot[]>(mockForecasts as ForecastSnapshot[]);
  const [isLoading, setIsLoading] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Fetch forecast data when leadHours change
  React.useEffect(() => {
    async function loadForecast() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/forecast?leadHours=${activeLeadHours}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setForecasts(json.data);
          }
        }
      } catch (err) {
        console.warn('Using local mock forecast data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadForecast();
  }, [activeLeadHours]);

  const selectedDistrict = selectedDistrictId
    ? forecasts.find(
        (f) => f.geography.districtId.toLowerCase() === selectedDistrictId.toLowerCase()
      ) || null
    : null;

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-56px)] overflow-hidden bg-graphite-950 font-mono">
      {/* Left Panel: Interactive Geospatial Map Engine */}
      <div
        className={`relative h-[50vh] lg:h-full border-b lg:border-b-0 lg:border-r border-graphite-700 transition-all duration-300 ease-in-out flex-shrink-0 ${
          !leftOpen
            ? 'w-full lg:w-12'
            : !rightOpen
              ? 'w-full lg:flex-1'
              : 'w-full lg:w-[55%]'
        }`}
      >
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="absolute top-3 right-3 z-30 w-7 h-7 bg-graphite-900/90 border border-graphite-700 hover:border-chartreuse/60 text-smoke hover:text-chartreuse flex items-center justify-center transition-all duration-150 backdrop-blur-sm"
          title={leftOpen ? 'Collapse map panel' : 'Expand map panel'}
        >
          {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {!leftOpen && (
          <div className="hidden lg:flex flex-col items-center justify-center h-full gap-2 py-4">
            <span className="text-[9px] font-mono text-smoke tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
              GEO MAP
            </span>
          </div>
        )}

        {leftOpen && (
          <Map
            activeLayers={activeLayers}
            selectedDistrictId={selectedDistrictId}
            onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
          >
            <AnimationOverlay
              isAnimationEnabled={showAnimation}
              activeLayers={activeLayers}
            />
            <RainfallLayer
              forecasts={forecasts}
              visible={activeLayers.includes('rainfall')}
              onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
            />
            <ProbabilityLayer forecasts={forecasts} visible={activeLayers.includes('heavyRainProbability')} />
            <RegimeLayer forecasts={forecasts} visible={activeLayers.includes('weatherRegime')} />
            <WindStreamLayer
              visible={activeLayers.includes('windStreamlines')}
            />
            <HazardMarkersLayer activeLayers={activeLayers} />
            <InfrastructureLayer visible={activeLayers.includes('roads')} />
            <LayerControl activeLayers={activeLayers} onToggleLayer={toggleLayer} />
          </Map>
        )}
      </div>

      {/* Right Panel: Intelligence Detail & Timeline */}
      <div
        className={`relative h-[50vh] lg:h-full overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 ${
          rightOpen ? 'w-full lg:flex-1' : 'w-full lg:w-12'
        }`}
      >
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="absolute top-3 left-3 z-30 w-7 h-7 bg-graphite-900/90 border border-graphite-700 hover:border-chartreuse/60 text-smoke hover:text-chartreuse flex items-center justify-center transition-all duration-150 backdrop-blur-sm"
          title={rightOpen ? 'Collapse forecast panel' : 'Expand forecast panel'}
        >
          {rightOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {!rightOpen && (
          <div className="hidden lg:flex flex-col items-center justify-center h-full gap-2 py-4">
            <span className="text-[9px] font-mono text-smoke tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
              FORECAST
            </span>
          </div>
        )}

        {rightOpen && (
          <ForecastPanel
            forecasts={forecasts}
            selectedDistrict={selectedDistrict}
            activeLeadHours={activeLeadHours}
            onSelectDistrict={(id) => updateState({ selectedDistrictId: id })}
            onClearDistrict={() => updateState({ selectedDistrictId: null })}
            onSelectLeadHours={(h) => updateState({ activeLeadHours: h })}
          />
        )}
      </div>
    </div>
  );
}
