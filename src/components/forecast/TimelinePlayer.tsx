'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, Clock } from 'lucide-react';

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
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, activeLeadHours, onSelectLeadHours]);

  return (
    <div className="flex flex-col gap-2 p-3 bg-graphite-900 border border-graphite-700 shadow-xl select-none font-mono">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-display font-bold text-paper text-sm tracking-wider uppercase">
          <Clock className="w-3.5 h-3.5 text-chartreuse" />
          <span>72-HOUR TIMELINE CYCLE</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-graphite-950 text-chartreuse border border-chartreuse/40 font-bold tracking-wider">
          LEAD // T+{activeLeadHours}H
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 font-mono font-bold text-xs flex items-center justify-center transition-all duration-150 ${
            isPlaying
              ? 'bg-amber text-graphite-950 shadow-[0_0_8px_rgba(255,179,71,0.4)]'
              : 'bg-chartreuse text-graphite-950 shadow-[0_0_8px_rgba(200,255,61,0.4)] hover:bg-chartreuse/90'
          }`}
          title={isPlaying ? 'Pause Auto-cycle' : 'Play 72h Timeline'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <div className="grid grid-cols-6 gap-1 flex-1">
          {LEAD_STEPS.map((h) => {
            const isSelected = activeLeadHours === h;
            return (
              <button
                key={h}
                onClick={() => {
                  setIsPlaying(false);
                  onSelectLeadHours(h);
                }}
                className={`py-1.5 px-1 font-mono text-[11px] font-bold transition-all duration-150 flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-graphite-950 text-chartreuse border-b-2 border-chartreuse shadow-[inset_0_-1px_0_rgba(200,255,61,0.6)]'
                    : 'bg-graphite-950/80 text-smoke hover:text-paper hover:bg-graphite-800 border border-graphite-800'
                }`}
              >
                <span>{h === 0 ? 'NOW' : `+${h}H`}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
