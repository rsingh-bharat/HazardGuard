'use client';

import React from 'react';

export const WaterFlowLegend: React.FC = () => {
  return (
    <div className="absolute top-4 left-4 z-20 p-3 /95 backdrop-blur-md border border-white/15 shadow-2xl text-xs space-y-2 select-none w-56 font-mono">
      <span className="font-tight font-bold text-white tracking-wider uppercase text-[11px]">
        3D FLOOD DEPTH & VELOCITY
      </span>

      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-signal-red" />
            <span className="text-white/70">CRITICAL (&gt; 2.0 M)</span>
          </div>
          <span className="text-signal-red font-bold">SEVERE</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber" />
            <span className="text-white/70">HIGH (1.0 - 2.0 M)</span>
          </div>
          <span className="text-amber font-bold">DANGER</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-300" />
            <span className="text-white/70">MODERATE (&lt; 1.0 M)</span>
          </div>
          <span className="text-amber-300 font-bold">CAUTION</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-chartreuse" />
            <span className="text-white/70">FLOW VECTORS</span>
          </div>
          <span className="text-chartreuse font-bold">&gt; 1.8 M/S</span>
        </div>
      </div>
    </div>
  );
};
