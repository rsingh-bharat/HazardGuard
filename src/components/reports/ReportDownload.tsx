'use client';

import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';

import { ForecastSnapshot } from '@/lib/contracts/forecast';

interface ReportDownloadProps {
  stateId: string;
  stateName: string;
  districtId?: string;
  districtName?: string;
  forecastId: string;
  includeImpact?: boolean;
  includeVerification?: boolean;
  forecasts: ForecastSnapshot[];
}

export const ReportDownload: React.FC<ReportDownloadProps> = ({
  stateId,
  stateName,
  districtId,
  districtName,
  forecastId,
  includeImpact = true,
  includeVerification = true,
  forecasts,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const label = districtName ? districtName.toUpperCase() : stateName.toUpperCase();
  const filename = districtName
    ? `${districtName.replace(/\s+/g, '_')}_${stateName.replace(/\s+/g, '_')}_Bulletin.pdf`
    : `${stateName.replace(/\s+/g, '_')}_Rainfall_Outlook.pdf`;

  const handleDownload = async () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stateId,
          districtId: districtId || null,
          forecastId,
          includeImpact,
          includeVerification,
          forecasts,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate PDF bulletin');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: unknown) {
      console.error('PDF Download Error:', err);
      const msg = err instanceof Error ? err.message : 'Report generation failed.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`py-3 px-6 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all duration-150 select-none uppercase tracking-wider w-full rounded-xl ${
        downloadSuccess
          ? 'bg-chartreuse text-graphite-950 shadow-[0_0_15px_rgba(200,255,61,0.5)]'
          : 'bg-chartreuse hover:bg-chartreuse/90 text-graphite-950 shadow-[0_0_15px_rgba(200,255,61,0.3)] disabled:opacity-50'
      }`}
    >
      {isGenerating ? (
        <>
          <div className="w-4 h-4 border-2 border-graphite-950 border-t-transparent rounded-full animate-spin" />
          <span>COMPILING BULLETIN...</span>
        </>
      ) : downloadSuccess ? (
        <>
          <Check className="w-4 h-4" />
          <span>DOWNLOADED</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>DOWNLOAD {label} BULLETIN</span>
        </>
      )}
    </button>
  );
};
