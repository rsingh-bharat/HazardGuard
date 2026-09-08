import React, { useState } from "react";
import { SceneLayersConfig } from "@/lib/contracts/impact";
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Mountain, 
  Waves, 
  Navigation, 
  Activity, 
  Building2, 
  ChevronRight, 
  ChevronLeft,
  ChevronsUpDown,
  CloudRain,
  Car
} from "lucide-react";

interface LayerControlsProps {
  layers: SceneLayersConfig;
  onChangeLayers: (updated: SceneLayersConfig) => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  layers,
  onChangeLayers
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleLayer = (key: keyof SceneLayersConfig) => {
    if (typeof layers[key] === "boolean") {
      onChangeLayers({
        ...layers,
        [key]: !layers[key]
      });
    }
  };

  const handleVerticalScale = (scale: number) => {
    onChangeLayers({
      ...layers,
      verticalScale: scale
    });
  };

  const setBasemapStyle = (style: "satellite" | "topo" | "dark") => {
    onChangeLayers({
      ...layers,
      basemapStyle: style
    });
  };

  return (
    <div className="absolute top-20 left-4 z-20 select-none">
      <div className="flex items-start">
        
        {/* Main Panel */}
        <div
          className={`bg-graphite-900/90 backdrop-blur-md border border-graphite-800 clipped-br shadow-2xl transition-all duration-300 overflow-hidden ${
            isExpanded ? "w-64 p-3.5" : "w-0 p-0 border-none opacity-0"
          }`}
        >
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-graphite-800">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-warm-paper">
              <Layers className="w-4 h-4 text-chartreuse" />
              <span>3D Twin Layers</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 clipped-br hover:bg-graphite-800 text-smoke hover:text-warm-paper transition"
              title="Collapse layers panel"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Basemap Style Switcher */}
          <div className="mb-2 pb-2 border-b border-graphite-800">
            <div className="text-[10px] font-mono text-smoke uppercase font-semibold mb-1">
              Basemap Mode
            </div>
            <div className="grid grid-cols-3 gap-1 bg-graphite-950 p-1 clipped-br border border-graphite-800 text-[10px] font-mono">
              <button
                onClick={() => setBasemapStyle("satellite")}
                className={`py-1 clipped-br font-semibold transition ${
                  (layers.basemapStyle || "satellite") === "satellite"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-smoke hover:text-warm-paper"
                }`}
              >
                Street Map
              </button>
              <button
                onClick={() => setBasemapStyle("topo")}
                className={`py-1 clipped-br font-semibold transition ${
                  layers.basemapStyle === "topo"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-smoke hover:text-warm-paper"
                }`}
              >
                Topo DEM
              </button>
              <button
                onClick={() => setBasemapStyle("dark")}
                className={`py-1 clipped-br font-semibold transition ${
                  layers.basemapStyle === "dark"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-smoke hover:text-warm-paper"
                }`}
              >
                Tactical
              </button>
            </div>
          </div>

          {/* Layer Toggle Items */}
          <div className="flex flex-col gap-1.5 text-xs">
            
            {/* 3D Falling Rain */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition bg-graphite-950/40">
              <div className="flex items-center gap-2 text-warm-paper">
                <CloudRain className="w-3.5 h-3.5 text-warm-paper animate-pulse" />
                <span className="font-semibold">3D Falling Rain</span>
              </div>
              <button
                onClick={() => toggleLayer("rain")}
                className={`p-1 clipped-br ${layers.rain ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.rain ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Flood Inundation Surface */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <Waves className="w-3.5 h-3.5 text-blue-400" />
                <span>Flood Inundation</span>
              </div>
              <button
                onClick={() => toggleLayer("water")}
                className={`p-1 clipped-br ${layers.water ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.water ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* 3D Real City Buildings */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition bg-graphite-950/40">
              <div className="flex items-center gap-2 text-warm-paper">
                <Building2 className="w-3.5 h-3.5 text-chartreuse" />
                <span className="font-semibold">3D City Structures</span>
              </div>
              <button
                onClick={() => toggleLayer("buildings")}
                className={`p-1 clipped-br ${layers.buildings ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.buildings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* 3D Road Blockages */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition bg-graphite-950/40">
              <div className="flex items-center gap-2 text-warm-paper">
                <span className="w-2 h-2 clipped-both bg-signal-red animate-ping" />
                <span className="font-semibold text-signal-red">3D Road Blockages</span>
              </div>
              <button
                onClick={() => toggleLayer("blockages")}
                className={`p-1 clipped-br ${layers.blockages ? "text-signal-red" : "text-smoke"}`}
              >
                {layers.blockages ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Drainage Overflows */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <Waves className="w-3.5 h-3.5 text-chartreuse animate-pulse" />
                <span>Drainage Overflows</span>
              </div>
              <button
                onClick={() => toggleLayer("overflows")}
                className={`p-1 clipped-br ${layers.overflows ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.overflows ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Street Vehicles & Streetlights */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <Car className="w-3.5 h-3.5 text-amber" />
                <span>Street Traffic & Lamps</span>
              </div>
              <button
                onClick={() => toggleLayer("streetBuildings")}
                className={`p-1 clipped-br ${layers.streetBuildings ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.streetBuildings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Road Ribbons */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <span className="w-3.5 h-1.5 clipped-both bg-chartreuse/10 inline-block" />
                <span>Road Network</span>
              </div>
              <button
                onClick={() => toggleLayer("roads")}
                className={`p-1 clipped-br ${layers.roads ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.roads ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* D8 Flow Vectors */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <Navigation className="w-3.5 h-3.5 text-warm-paper" />
                <span>Flow Vector Arrows</span>
              </div>
              <button
                onClick={() => toggleLayer("flowVectors")}
                className={`p-1 clipped-br ${layers.flowVectors ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.flowVectors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Drainage Outfalls */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <span className="w-3.5 h-3.5 clipped-both border-2 border-chartreuse inline-block" />
                <span>Drainage Outfalls</span>
              </div>
              <button
                onClick={() => toggleLayer("drainage")}
                className={`p-1 clipped-br ${layers.drainage ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.drainage ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Critical Facilities */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <Activity className="w-3.5 h-3.5 text-signal-red" />
                <span>Critical Hospitals</span>
              </div>
              <button
                onClick={() => toggleLayer("facilities")}
                className={`p-1 clipped-br ${layers.facilities ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.facilities ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Terrain Layer */}
            <div className="flex items-center justify-between p-1.5 clipped-br hover:bg-graphite-800/60 transition">
              <div className="flex items-center gap-2 text-paper-dim">
                <Mountain className="w-3.5 h-3.5 text-amber" />
                <span>Topographic DEM</span>
              </div>
              <button
                onClick={() => toggleLayer("terrain")}
                className={`p-1 clipped-br ${layers.terrain ? "text-chartreuse" : "text-smoke"}`}
              >
                {layers.terrain ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Wireframe */}
            <div className="flex items-center justify-between p-1.5 pl-6 clipped-br hover:bg-graphite-800/60 transition text-smoke">
              <span className="text-[11px]">Wireframe Mesh</span>
              <input
                type="checkbox"
                checked={layers.terrainWireframe}
                onChange={() => toggleLayer("terrainWireframe")}
                className="clipped-br accent-chartreuse cursor-pointer"
              />
            </div>

          </div>

          {/* Vertical Elevation Exaggeration Slider */}
          <div className="mt-3 pt-2.5 border-t border-graphite-800">
            <div className="flex items-center justify-between text-[11px] font-mono text-smoke mb-1">
              <span className="flex items-center gap-1">
                <ChevronsUpDown className="w-3 h-3 text-chartreuse" />
                <span>Vertical Scale</span>
              </span>
              <span className="font-bold text-warm-paper">{layers.verticalScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={layers.verticalScale}
              onChange={(e) => handleVerticalScale(Number(e.target.value))}
              className="w-full h-1.5 bg-graphite-800 clipped-br appearance-none cursor-pointer accent-chartreuse"
            />
          </div>

          {/* Legend */}
          <div className="mt-3 pt-2.5 border-t border-graphite-800 text-[10px] text-smoke flex flex-col gap-1.5">
            <span className="font-mono uppercase font-bold text-paper-dim">Depth / Disruption</span>
            
            {/* Gradient scale */}
            <div className="w-full h-2 clipped-br bg-gradient-to-r from-chartreuse via-violet to-signal-red" />
            <div className="flex justify-between font-mono text-[9px]">
              <span>0.05m (Watch)</span>
              <span>0.25m (High)</span>
              <span>&gt;0.40m (Critical)</span>
            </div>

            {/* Road status pins */}
            <div className="grid grid-cols-2 gap-1 mt-1 font-mono text-[9px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 clipped-both bg-chartreuse" /> Normal Free Flow
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 clipped-both bg-amber" /> Speed Reduced
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 clipped-both bg-amber" /> Severe Delays
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 clipped-both bg-signal-red" /> Impassable Cutoff
              </span>
            </div>
          </div>

        </div>

        {/* Minimized Toggle Button */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="bg-graphite-900/90 backdrop-blur border border-graphite-800 clipped-br p-2.5 text-paper-dim hover:text-white shadow-xl hover:bg-graphite-800 transition"
            title="Expand 3D Layer Controls"
          >
            <Layers className="w-5 h-5 text-chartreuse" />
          </button>
        )}

      </div>
    </div>
  );
};
