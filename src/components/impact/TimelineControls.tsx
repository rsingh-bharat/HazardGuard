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
    <div 
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl p-4 shadow-2xl z-30 select-none pointer-events-auto rounded-[24px]"
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.258) 24%, rgba(255,255,255,.252) 78%, rgba(255,255,255,.232) 100%)", backdropFilter: "blur(26px) saturate(118%)", WebkitBackdropFilter: "blur(26px) saturate(118%)", border: "1px solid rgba(255,255,255,.20)" }}
    >
      <div className="flex flex-col gap-3">
        
        {/* Upper Row: Status, Current Time, Rainfall Metrics, and Playback Controls */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Current Simulation Timestamp Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#C8FF3D] font-mono font-bold text-sm shadow-inner">
              <Clock className="w-4 h-4 text-[#C8FF3D]" />
              <span>{currentState.timestamp}</span>
              <span className="text-xs text-white/70 font-normal ml-1">({currentState.hours}h elapsed)</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-white/80 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <span>Accum: <strong className="text-white">{currentState.rainfall_accum_mm} mm</strong></span>
              <span className="text-white/40">•</span>
              <span>Rate: <strong className="text-white">{((currentState.rainfall_increment_mm || 0) / 3).toFixed(1)} mm/h</strong></span>
            </div>
          </div>
          
          {/* Center Playback Buttons */}
          <div className="flex items-center gap-2 bg-white/10 rounded-full p-1 border border-white/20">
            <button
              onClick={() => onSelectStepIndex(Math.max(0, currentStepIndex - 1))}
              disabled={currentStepIndex === 0}
              className="p-2 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent text-white transition"
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              className="p-2.5 rounded-full bg-[#C8FF3D] text-black hover:bg-white shadow-[0_0_15px_rgba(200,255,61,0.3)] transition transform active:scale-95"
              title={isPlaying ? "Pause Simulation" : "Play Continuous Simulation"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black" />}
            </button>

            <button
              onClick={() => onSelectStepIndex(Math.min(timeline.length - 1, currentStepIndex + 1))}
              disabled={currentStepIndex === timeline.length - 1}
              className="p-2 rounded-full hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent text-white transition"
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleSpeed}
              className="ml-1 px-3 py-1.5 rounded-full hover:bg-white/10 text-[11px] font-mono font-bold text-white border border-white/10 transition"
              title="Toggle Playback Speed"
            >
              {playbackSpeed}x
            </button>
          </div>

          {/* Quick Warning / Runoff telemetry */}
          <div className="hidden md:flex items-center gap-3 font-mono text-xs text-white/70 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
            <span>Runoff: <strong className="text-violet-400">{currentState.runoff_depth_mm} mm</strong></span>
            <span className="w-px h-3 bg-white/20"></span>
            <span>Warnings: <strong className={currentState.warnings.length > 0 ? "text-[#FFB347] font-bold" : "text-white/70"}>{currentState.warnings.length}</strong></span>
          </div>

        </div>

        {/* Lower Row: Hyetograph & Slider Track */}
        <div className="relative w-full flex flex-col gap-2 mt-1">
          
          {/* Hyetograph Profile Mini Bar Chart */}
          <div className="w-full h-10 flex items-end gap-1 px-2">
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
                    className={`w-full rounded-t-sm transition-all duration-200 ${
                      isSelected
                        ? "bg-[#C8FF3D] shadow-[0_0_10px_rgba(200,255,61,0.5)]"
                        : idx <= currentStepIndex
                        ? "bg-violet-500 group-hover:bg-violet-400"
                        : "bg-white/20 group-hover:bg-white/40"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Interactive Range Slider */}
          <div className="relative flex items-center px-2">
            <input
              type="range"
              min="0"
              max={timeline.length - 1}
              step="1"
              value={currentStepIndex}
              onChange={(e) => onSelectStepIndex(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#C8FF3D] bg-white/20 z-10"
            />
          </div>

          {/* Timestep Labels */}
          <div className="w-full flex justify-between text-[10px] font-mono text-white/50 px-3">
            {timeline.map((step, idx) => (
              <span
                key={step.timestamp}
                onClick={() => onSelectStepIndex(idx)}
                className={`cursor-pointer transition ${
                  idx === currentStepIndex ? "text-[#C8FF3D] font-bold" : "hover:text-white"
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
