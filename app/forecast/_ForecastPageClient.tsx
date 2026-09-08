'use client';

import React, { useState, useEffect } from 'react';
import { Map } from '@/components/map/Map';
import { RainfallLayer } from '@/components/map/RainfallLayer';
import { ProbabilityLayer } from '@/components/map/ProbabilityLayer';
import { RegimeLayer } from '@/components/map/RegimeLayer';
import { DistrictForecast } from '@/components/forecast/DistrictForecast';
import { LayerControl } from '@/components/map/LayerControl';
import { useShareableState } from '@/lib/state/useShareableState';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import mockForecasts from '@/data/mock/forecast.json';
import { Search, Filter, MapPin, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export default function ForecastPageClient() {
  const {
    selectedDistrictId,
    selectedStateId,
    activeLeadHours,
    activeLayers,
    showAnimation,
    updateState,
    toggleLayer,
  } = useShareableState();

  const [forecasts, setForecasts] = useState<ForecastSnapshot[]>(mockForecasts as ForecastSnapshot[]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>(selectedStateId || 'ALL');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    async function fetchForecasts() {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('leadHours', activeLeadHours.toString());
        if (selectedState !== 'ALL') queryParams.set('stateId', selectedState);

        const res = await fetch(`/api/forecast?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setForecasts(json.data);
        }
      } catch (e) {
        console.warn('Forecast fetch fallback:', e);
      }
    }
    fetchForecasts();
  }, [activeLeadHours, selectedState]);

  const states = [
    { id: 'ALL', name: 'ALL STATES & UTS' },
    { id: 'MH', name: 'MAHARASHTRA' },
    { id: 'KL', name: 'KERALA' },
    { id: 'OR', name: 'ODISHA' },
    { id: 'GJ', name: 'GUJARAT' },
    { id: 'AS', name: 'ASSAM' },
    { id: 'UT', name: 'UTTARAKHAND' },
    { id: 'HP', name: 'HIMACHAL PRADESH' },
    { id: 'WB', name: 'WEST BENGAL' },
    { id: 'AP', name: 'ANDHRA PRADESH' },
    { id: 'TS', name: 'TELANGANA' },
    { id: 'TN', name: 'TAMIL NADU' },
    { id: 'KA', name: 'KARNATAKA' },
    { id: 'BR', name: 'BIHAR' },
    { id: 'MP', name: 'MADHYA PRADESH' },
    { id: 'RJ', name: 'RAJASTHAN' },
    { id: 'UP', name: 'UTTAR PRADESH' },
  ];

  const filteredForecasts = forecasts.filter((f) => {
    const matchesSearch =
      f.geography.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.geography.stateName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = selectedState === 'ALL' || f.geography.stateId.toUpperCase() === selectedState.toUpperCase();
    return matchesSearch && matchesState;
  });

  const selectedDistrict = selectedDistrictId
    ? forecasts.find(
        (f) => f.geography.districtId.toLowerCase() === selectedDistrictId.toLowerCase()
      ) || null
    : null;

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-56px)] overflow-hidden bg-graphite-950 select-none font-mono">
      {/* Left Panel: Map */}
      <div
        className={`relative h-[50vh] lg:h-full border-r border-graphite-700 transition-all duration-300 ease-in-out flex-shrink-0 ${
          !leftOpen
            ? 'w-full lg:w-12'
            : !rightOpen
              ? 'w-full lg:flex-1'
              : 'w-full lg:w-[55%]'
        }`}
      >
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className="absolute top-3 right-3 z-30 w-7 h-7 bg-graphite-900/90 border border-graphite-700 hover:border-chartreuse/60 text-smoke hover:text-chartreuse flex items-center justify-center transition-all backdrop-blur-sm"
          title={leftOpen ? 'Collapse map' : 'Expand map'}
        >
          {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {!leftOpen && (
          <div className="hidden lg:flex flex-col items-center justify-center h-full">
            <span className="text-[9px] font-mono text-smoke tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
              MAP
            </span>
          </div>
        )}

        {leftOpen && (
          <Map
            activeLayers={activeLayers}
            selectedDistrictId={selectedDistrictId}
            onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
          >
            <RainfallLayer
              forecasts={forecasts}
              visible={true}
              showAnimation={showAnimation && activeLayers.includes('rainfall')}
              onDistrictClick={(id) => updateState({ selectedDistrictId: id })}
            />
            <ProbabilityLayer forecasts={forecasts} visible={activeLayers.includes('heavyRainProbability')} />
            <RegimeLayer forecasts={forecasts} visible={activeLayers.includes('weatherRegime')} />
            <LayerControl activeLayers={activeLayers} onToggleLayer={toggleLayer} />
          </Map>
        )}
      </div>

      {/* Right Panel: Forecast Intelligence List */}
      <div
        className={`relative h-[50vh] lg:h-full flex flex-col bg-graphite-900 overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 ${
          rightOpen ? 'w-full lg:flex-1' : 'w-full lg:w-12'
        }`}
      >
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className="absolute top-3 left-3 z-30 w-7 h-7 bg-graphite-900/90 border border-graphite-700 hover:border-chartreuse/60 text-smoke hover:text-chartreuse flex items-center justify-center transition-all backdrop-blur-sm"
          title={rightOpen ? 'Collapse forecast list' : 'Expand forecast list'}
        >
          {rightOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {!rightOpen && (
          <div className="hidden lg:flex flex-col items-center justify-center h-full">
            <span className="text-[9px] font-mono text-smoke tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
              FORECAST
            </span>
          </div>
        )}

        {rightOpen && (
          <>
            <div className="pl-10 pr-3 pt-3 pb-3 bg-graphite-950 border-b border-graphite-700 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-smoke absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Query Indian districts by name or state code..."
                    className="w-full bg-graphite-900 border border-graphite-700 pl-8 pr-3 py-2 text-xs text-paper placeholder-smoke focus:outline-none focus:border-chartreuse font-mono"
                  />
                </div>

                <div className="relative flex items-center gap-1 bg-graphite-900 border border-graphite-700 px-2 py-1.5 min-w-[130px]">
                  <Filter className="w-3.5 h-3.5 text-chartreuse shrink-0" />
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      updateState({ selectedStateId: e.target.value === 'ALL' ? null : e.target.value });
                    }}
                    className="appearance-none bg-transparent text-xs text-paper font-bold focus:outline-none cursor-pointer uppercase flex-1 pr-4"
                  >
                    {states.map((s) => (
                      <option key={s.id} value={s.id} className="bg-graphite-950 text-paper">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-smoke absolute right-2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {selectedDistrict ? (
                <DistrictForecast
                  district={selectedDistrict}
                  onBack={() => updateState({ selectedDistrictId: null })}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-paper-dim font-bold px-1 border-b border-graphite-800 pb-1.5">
                    <div className="flex items-center gap-1.5 text-chartreuse">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="font-display tracking-wider uppercase">MATCHING DISTRICT ARRAY ({filteredForecasts.length})</span>
                    </div>
                    <span className="text-[9px] text-smoke font-normal">ENGAGE TO INSPECT</span>
                  </div>

                  <div className="space-y-1.5">
                    {filteredForecasts.map((d) => {
                      const isRed = d.rainfall.alertLevel === 'RED';
                      return (
                        <div
                          key={d.geography.districtId}
                          onClick={() => updateState({ selectedDistrictId: d.geography.districtId })}
                          className="flex items-center justify-between p-2.5 bg-graphite-950 hover:bg-graphite-850 border border-graphite-800 hover:border-chartreuse/60 transition-all duration-150 cursor-pointer"
                        >
                          <div>
                            <div className="font-display font-bold text-paper text-sm uppercase tracking-wide">
                              {d.geography.districtName}, {d.geography.stateName}
                            </div>
                            <div className="text-[9px] text-smoke">
                              SYNOPTIC: {d.regime.label} · P(&gt;64MM): {(d.probability.heavyRain_64mm * 100).toFixed(0)}%
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`font-mono font-bold text-xs ${isRed ? 'text-signal-red' : 'text-amber'}`}>
                              {d.rainfall.correctedMm.toFixed(1)} mm
                            </div>
                            <span className={`text-[9px] font-mono font-extrabold px-1.5 tracking-wider ${
                              isRed
                                ? 'bg-signal-red text-graphite-950'
                                : d.rainfall.alertLevel === 'ORANGE'
                                ? 'bg-amber text-graphite-950'
                                : d.rainfall.alertLevel === 'YELLOW'
                                ? 'bg-amber-300 text-graphite-950'
                                : 'bg-chartreuse text-graphite-950'
                            }`}>
                              {d.rainfall.alertLevel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
