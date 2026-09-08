'use client';

import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

interface ReportPreviewProps {
  stateName: string;
  forecastId: string;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ stateName, forecastId }) => {
  return (
    <div className="p-5 bg-graphite-900 border border-graphite-700 shadow-xl space-y-4 select-none text-xs font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-graphite-800">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-chartreuse" />
          <div>
            <h2 className="font-display font-bold text-sm text-paper uppercase tracking-wider">
              5-PAGE OFFICIAL BULLETIN DOCUMENT STRUCTURE
            </h2>
            <span className="text-[10px] text-smoke">
              STATE: <b className="text-paper">{stateName.toUpperCase()}</b> · REF: <span className="font-mono text-chartreuse">{forecastId}</span>
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 bg-graphite-950 text-chartreuse font-bold border border-chartreuse/40 text-[9px] tracking-wider">
          A4 PDF ARCHIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Page 1 */}
        <div className="p-3.5 bg-graphite-950 border border-graphite-800 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-chartreuse font-bold">PAGE 01</span>
            <h3 className="font-display font-bold text-paper text-xs uppercase tracking-wider mt-1">Executive Summary</h3>
            <p className="font-sans text-[10px] text-smoke mt-1 leading-relaxed">
              MoES/IMD official advisory, state risk overview, count of RED/ORANGE districts, top critical zones.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-chartreuse font-semibold">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </div>
        </div>

        {/* Page 2 */}
        <div className="p-3.5 bg-graphite-950 border border-graphite-800 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-chartreuse font-bold">PAGE 02</span>
            <h3 className="font-display font-bold text-paper text-xs uppercase tracking-wider mt-1">District Risk Matrix</h3>
            <p className="font-sans text-[10px] text-smoke mt-1 leading-relaxed">
              Color-coded district ranking by corrected rainfall (mm), alert level, heavy rain probabilities, and regimes.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-chartreuse font-semibold">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </div>
        </div>

        {/* Page 3 */}
        <div className="p-3.5 bg-graphite-950 border border-graphite-800 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-chartreuse font-bold">PAGE 03</span>
            <h3 className="font-display font-bold text-paper text-xs uppercase tracking-wider mt-1">Forecast Verification</h3>
            <p className="font-sans text-[10px] text-smoke mt-1 leading-relaxed">
              Scientific evaluation table (RMSE, MAE, CSI, ETS, POD, FAR, FSS) showing AI skill gain vs raw NWP.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-chartreuse font-semibold">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </div>
        </div>

        {/* Page 4 */}
        <div className="p-3.5 bg-graphite-950 border border-graphite-800 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-chartreuse font-bold">PAGE 04</span>
            <h3 className="font-display font-bold text-paper text-xs uppercase tracking-wider mt-1">3D Impact Outlook</h3>
            <p className="font-sans text-[10px] text-smoke mt-1 leading-relaxed">
              Infrastructure exposure breakdown: roads, buildings, hospitals, power substations, and affected citizens.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-chartreuse font-semibold">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </div>
        </div>

        {/* Page 5 */}
        <div className="p-3.5 bg-graphite-950 border border-graphite-800 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-mono text-chartreuse font-bold">PAGE 05</span>
            <h3 className="font-display font-bold text-paper text-xs uppercase tracking-wider mt-1">Uncertainty & Provenance</h3>
            <p className="font-sans text-[10px] text-smoke mt-1 leading-relaxed">
              Ensemble uncertainty ranges, regime frequency distributions, model versions, and NDMA digital sign-off.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-chartreuse font-semibold">
            <CheckCircle2 className="w-3 h-3" /> ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
};
