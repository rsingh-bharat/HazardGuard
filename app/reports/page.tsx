'use client'

export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { ReportPreview } from '@/components/reports/ReportPreview';
import { ReportDownload } from '@/components/reports/ReportDownload';
import { FileText, Clock, Download, Shield, ChevronDown } from 'lucide-react';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { useSearchParams } from 'next/navigation';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [selectedStateId, setSelectedStateId] = useState(searchParams?.get('stateId') || 'MH');
  const [selectedDistrictId, setSelectedDistrictId] = useState(searchParams?.get('districtId') || '');
  const [includeImpact, setIncludeImpact] = useState(true);
  const [includeVerification, setIncludeVerification] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadForecast() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/forecast?leadHours=24`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setForecasts(json.data);
          }
        }
      } catch (err) {
        console.warn('Failed to load live forecast:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadForecast();
  }, []);

  const states = [
    { id: 'MH', name: 'Maharashtra' },
    { id: 'KL', name: 'Kerala' },
    { id: 'OR', name: 'Odisha' },
    { id: 'GJ', name: 'Gujarat' },
    { id: 'AS', name: 'Assam' },
    { id: 'UT', name: 'Uttarakhand' },
    { id: 'HP', name: 'Himachal Pradesh' },
    { id: 'WB', name: 'West Bengal' },
    { id: 'AP', name: 'Andhra Pradesh' },
    { id: 'TS', name: 'Telangana' },
    { id: 'TN', name: 'Tamil Nadu' },
    { id: 'KA', name: 'Karnataka' },
    { id: 'BR', name: 'Bihar' },
    { id: 'MP', name: 'Madhya Pradesh' },
  ];

  // Districts from live forecast data filtered by selected state
  const availableDistricts = useMemo(() => {
    return forecasts
      .filter((f) => f.geography.stateId.toUpperCase() === selectedStateId.toUpperCase())
      .map((f) => ({ id: f.geography.districtId, name: f.geography.districtName }));
  }, [selectedStateId, forecasts]);

  const selectedStateName = states.find((s) => s.id === selectedStateId)?.name || 'Maharashtra';
  const selectedDistrictName = availableDistricts.find((d) => d.id === selectedDistrictId)?.name || '';

  // When state changes, reset district selection
  const handleStateChange = (stateId: string) => {
    setSelectedStateId(stateId);
    setSelectedDistrictId('');
  };

  const samplePastReports = [
    {
      id: 'rep_MH_20260901',
      state: 'Maharashtra',
      district: 'Pune',
      forecastId: 'forecast_20260901_00z',
      date: '01 Sep 2026, 06:00 UTC',
      pages: 5,
      size: '1.24 MB',
    },
    {
      id: 'rep_OR_20260901',
      state: 'Odisha',
      district: 'Puri',
      forecastId: 'forecast_20260901_00z',
      date: '01 Sep 2026, 06:15 UTC',
      pages: 5,
      size: '1.18 MB',
    },
    {
      id: 'rep_KL_20260901',
      state: 'Kerala',
      district: 'Wayanad',
      forecastId: 'forecast_20260901_00z',
      date: '01 Sep 2026, 06:30 UTC',
      pages: 5,
      size: '1.32 MB',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 select-none pb-16 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-graphite-900 border border-graphite-700 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-chartreuse text-graphite-950 font-bold">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="font-display text-2xl font-bold tracking-wider text-paper uppercase">
              OFFICIAL DISASTER BULLETIN COMPILER
            </h1>
          </div>
          <p className="font-sans text-xs text-smoke mt-1">
            Automated compilation of 5-page district bulletins compliant with NDMA and Ministry of Earth Sciences guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-chartreuse" />
          <span className="text-xs text-chartreuse font-bold uppercase tracking-wider">AUTHORIZED NDMA/SDMA RELEASE</span>
        </div>
      </div>

      {/* Generator Configuration Card */}
      <div className="p-5 bg-graphite-900 border border-graphite-700 shadow-xl space-y-4">
        <h2 className="font-display text-sm font-bold text-paper uppercase tracking-wider">
          BULLETIN PARAMETERS — STATE &amp; DISTRICT SELECTION
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* State Selection */}
          <div>
            <label className="block text-[10px] text-smoke mb-1.5 font-bold uppercase">
              TARGET STATE / UT
            </label>
            <div className="relative">
              <select
                value={selectedStateId}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full appearance-none bg-graphite-950 border border-graphite-700 p-2.5 text-xs text-paper font-bold focus:outline-none focus:border-chartreuse pr-8"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id} className="bg-graphite-950 text-paper">
                    {s.name.toUpperCase()} ({s.id})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-smoke absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* District Selection */}
          <div>
            <label className="block text-[10px] text-smoke mb-1.5 font-bold uppercase">
              TARGET DISTRICT
            </label>
            <div className="relative">
              <select
                value={selectedDistrictId}
                onChange={(e) => setSelectedDistrictId(e.target.value)}
                className="w-full appearance-none bg-graphite-950 border border-graphite-700 p-2.5 text-xs text-paper font-bold focus:outline-none focus:border-chartreuse pr-8 disabled:opacity-40"
                disabled={availableDistricts.length === 0}
              >
                <option value="" className="bg-graphite-950 text-smoke">
                  {availableDistricts.length > 0 ? 'ENTIRE STATE (ALL DISTRICTS)' : 'No districts in mock data'}
                </option>
                {availableDistricts.map((d) => (
                  <option key={d.id} value={d.id} className="bg-graphite-950 text-paper">
                    {d.name.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-smoke absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Forecast Window */}
          <div>
            <label className="block text-[10px] text-smoke mb-1.5 font-bold uppercase">
              FORECAST CYCLE WINDOW
            </label>
            <input
              type="text"
              disabled
              value="72-HOUR ENSEMBLE (forecast_20260901_00z)"
              className="w-full bg-graphite-950 border border-graphite-700 p-2.5 text-xs text-smoke font-mono"
            />
          </div>

          {/* Download Button */}
          <div className="flex flex-col justify-end">
            <ReportDownload
              stateId={selectedStateId}
              stateName={selectedStateName}
              districtId={selectedDistrictId || undefined}
              districtName={selectedDistrictName || undefined}
              forecastId="forecast_20260901_00z"
              includeImpact={includeImpact}
              includeVerification={includeVerification}
              forecasts={forecasts}
            />
          </div>
        </div>

        {/* Selected scope indicator */}
        <div className="flex items-center gap-2 p-2 bg-graphite-950 border border-graphite-800 text-[10px] font-mono">
          <span className="text-smoke">BULLETIN SCOPE:</span>
          <span className="text-chartreuse font-bold">
            {selectedDistrictId && selectedDistrictName
              ? `${selectedDistrictName.toUpperCase()}, ${selectedStateName.toUpperCase()} (DISTRICT-LEVEL)`
              : `${selectedStateName.toUpperCase()} — ALL DISTRICTS (STATE-LEVEL)`}
          </span>
        </div>

        {/* Section Inclusions */}
        <div className="flex items-center gap-6 pt-3 border-t border-graphite-800 text-xs text-paper-dim">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVerification}
              onChange={(e) => setIncludeVerification(e.target.checked)}
              className="accent-chartreuse rounded-none cursor-pointer"
            />
            <span>Include Model Verification Skill Table (Page 3)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeImpact}
              onChange={(e) => setIncludeImpact(e.target.checked)}
              className="accent-chartreuse rounded-none cursor-pointer"
            />
            <span>Include 3D Digital Twin Exposure Snapshot (Page 4)</span>
          </label>
        </div>
      </div>

      {/* 5-Page PDF Breakdown Preview */}
      <ReportPreview
        stateName={selectedDistrictName ? `${selectedDistrictName}, ${selectedStateName}` : selectedStateName}
        forecastId="forecast_20260901_00z"
      />

      {/* Audit History */}
      <div className="bg-graphite-900 border border-graphite-700 shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-graphite-950 border-b border-graphite-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-chartreuse" />
            <h3 className="font-display text-xs font-bold text-paper uppercase tracking-wider">
              OFFICIAL BULLETIN ARCHIVE // REPOSITORY
            </h3>
          </div>
          <span className="text-[10px] text-smoke font-mono">03 ARCHIVED PUBLICATIONS</span>
        </div>

        <div className="divide-y divide-graphite-800 text-xs">
          {samplePastReports.map((rep) => (
            <div
              key={rep.id}
              className="p-4 flex items-center justify-between hover:bg-graphite-850 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-graphite-950 border border-graphite-700 text-chartreuse">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-paper text-sm">
                    {rep.district}, {rep.state.toUpperCase()} — MONSOON OUTLOOK BULLETIN
                  </div>
                  <div className="text-[10px] text-smoke font-mono">
                    REF: {rep.forecastId} · GENERATED: {rep.date}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] text-smoke font-mono">
                  {rep.pages} PAGES · {rep.size}
                </span>
                <button
                  onClick={() => alert(`Downloading archived bulletin: ${rep.id}`)}
                  className="p-2 bg-graphite-950 hover:bg-graphite-800 border border-graphite-700 text-smoke hover:text-paper transition"
                  title="Download Archived Bulletin"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
