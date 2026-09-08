import React, { useEffect } from "react";
import { ImpactTimelineState } from "@/lib/contracts/impact";
import { Play, Pause, SkipBack, SkipForward, Clock, CloudRain } from "lucide-react";

interface TimelineControlsProps {
  timeline: ImpactTimelineState[];
  currentStepIndex: number;
  onSelectStepIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onToggleSpeed: () => void;
}

export const TimelineControls: React.FC<TimelineControlsProps> = ({
  timeline,
  currentStepIndex,
  onSelectStepIndex,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onToggleSpeed
}) => {
  // Auto-advance timer when playing
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1500 / playbackSpeed;
    const timer = setInterval(() => {
      onSelectStepIndex((currentStepIndex + 1) % timeline.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, currentStepIndex, timeline.length, playbackSpeed, onSelectStepIndex]);

  const currentState = timeline[currentStepIndex] || timeline[0];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-graphite-900/90 backdrop-blur-md border border-graphite-800/90 clipped-br p-3 shadow-2xl shadow-black/80 z-20 select-none">
      <div className="flex flex-col gap-2.5">
        
        {/* Upper Row: Status, Current Time, Rainfall Metrics, and Playback Controls */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Current Simulation Timestamp Badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 clipped-br bg-chartreuse/10 border border-chartreuse/30 text-chartreuse font-mono font-bold text-sm shadow-inner">
              <Clock className="w-4 h-4 text-chartreuse" />
              <span>{currentState.timestamp}</span>
              <span className="text-xs text-smoke font-normal">({currentState.hours}h elapsed)</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-paper-dim px-2 py-1 bg-graphite-800/60 clipped-br border border-graphite-800/50">
              <CloudRain className="w-3.5 h-3.5 text-blue-400" />
              <span>Accum: <strong className="text-white">{currentState.rainfall_accum_mm} mm</strong></span>
              <span className="text-smoke">•</span>
              <span>Rate: <strong className="text-warm-paper">{((currentState.rainfall_increment_mm || 0) / 3).toFixed(1)} mm/h</strong></span>
            </div>
          </div>
          {/* Center Playback Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="p-1.5 clipped-tl bg-graphite-800 hover:bg-graphite-900 disabled:opacity-40 disabled:hover:bg-graphite-800 text-warm-paper transition"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2 clipped-br bg-chartreuse text-graphite-950 hover:bg-white shadow-[0_0_10px_rgba(200,255,61,0.2)] transition transform active:scale-95"
              title={isPlaying ? "Pause Simulation" : "Play Continuous Simulation"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-graphite-950" />}
            </button>

            <button
              onClick={() => onSelectStepIndex(Math.min(timeline.length - 1, currentStepIndex + 1))}
              disabled={currentStepIndex === timeline.length - 1}
              className="p-1.5 clipped-br bg-graphite-800 hover:bg-graphite-900 disabled:opacity-40 disabled:hover:bg-graphite-800 text-warm-paper transition"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleSpeed}
              className="ml-1 px-2 py-1 clipped-tl bg-graphite-800 hover:bg-graphite-900 text-[11px] font-mono font-bold text-paper-dim border border-graphite-800 transition"
              title="Toggle Playback Speed"
            >
              {playbackSpeed}x
            </button>
          </div>

          {/* Quick Warning / Runoff telemetry */}
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-smoke">
            <span>Runoff: <strong className="text-violet">{currentState.runoff_depth_mm} mm</strong></span>
            <span className="text-graphite-800"></span>
            <span>Warnings: <strong className={currentState.warnings.length > 0 ? "text-amber font-bold" : "text-smoke"}>{currentState.warnings.length}</strong></span>
          </div>

        </div>

        {/* Lower Row: Hyetograph & Slider Track */}
        <div className="relative w-full flex flex-col gap-1.5">
          
          {/* Hyetograph Profile Mini Bar Chart */}
          <div className="w-full h-8 flex items-end gap-1 px-1">
            {timeline.map((step, idx) => {
              const maxInc = Math.max(...timeline.map(s => s.rainfall_increment_mm || 0), 10);
              const heightPct = Math.max(8, ((step.rainfall_increment_mm || 0) / maxInc) * 100);
              const isSelected = idx === currentStepIndex;

              return (
                <div
                  key={step.timestamp}
                  onClick={() => onSelectStepIndex(idx)}
                  className="flex-1 h-full flex flex-col justify-end cursor-pointer group"
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full clipped-tl transition-all duration-200 ${
                      isSelected
                        ? "bg-chartreuse shadow-[0_0_10px_rgba(200,255,61,0.5)]"
                        : idx <= currentStepIndex
                        ? "bg-violet-deep group-hover:bg-violet"
                        : "bg-graphite-800/40 group-hover:bg-graphite-800"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Interactive Range Slider */}
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={timeline.length - 1}
              step="1"
              value={currentStepIndex}
              onChange={(e) => onSelectStepIndex(Number(e.target.value))}
              className="w-full h-2 bg-graphite-800 clipped-br appearance-none cursor-pointer accent-chartreuse z-10"
            />
          </div>

          {/* Timestep Labels */}
          <div className="w-full flex justify-between text-[10px] font-mono text-smoke px-1">
            {timeline.map((step, idx) => (
              <span
                key={step.timestamp}
                onClick={() => onSelectStepIndex(idx)}
                className={`cursor-pointer transition ${
                  idx === currentStepIndex ? "text-chartreuse font-bold underline" : "hover:text-warm-paper"
                }`}
              >
                {step.timestamp}
              </span>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
