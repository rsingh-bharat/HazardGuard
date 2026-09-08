'use client';

import React from 'react';

export const WaterFlowLegend: React.FC = () => {
  return (
    <div className="absolute top-4 left-4 z-20 p-3 bg-graphite-900/95 backdrop-blur-md border border-graphite-700 shadow-2xl text-xs space-y-2 select-none w-56 font-mono">
      <span className="font-display font-bold text-paper tracking-wider uppercase text-[11px]">
        3D FLOOD DEPTH & VELOCITY
      </span>

      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-signal-red" />
            <span className="text-paper-dim">CRITICAL (&gt; 2.0 M)</span>
          </div>
          <span className="text-signal-red font-bold">SEVERE</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber" />
            <span className="text-paper-dim">HIGH (1.0 - 2.0 M)</span>
          </div>
          <span className="text-amber font-bold">DANGER</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-300" />
            <span className="text-paper-dim">MODERATE (&lt; 1.0 M)</span>
          </div>
          <span className="text-amber-300 font-bold">CAUTION</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-graphite-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-chartreuse" />
            <span className="text-paper-dim">FLOW VECTORS</span>
          </div>
          <span className="text-chartreuse font-bold">&gt; 1.8 M/S</span>
        </div>
      </div>
    </div>
  );
};
