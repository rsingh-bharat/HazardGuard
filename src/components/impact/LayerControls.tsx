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
    <div className="absolute top-[var(--impact-panel-top)] left-4 bottom-[var(--impact-panel-bottom)] z-20 select-none pointer-events-none flex items-start gap-2">
      {/* Minimized Toggle Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="pointer-events-auto rounded-[20px] p-3 text-white/70 hover:text-white shadow-xl transition"
          style={{ background: "rgba(255,255,255,.15)", backdropFilter: "blur(16px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" }}
          title="Expand 3D Layer Controls"
        >
          <Layers className="w-5 h-5 text-[#C8FF3D]" />
        </button>
      )}

      {/* Main Panel */}
      <div
        className={`pointer-events-auto rounded-[24px] shadow-2xl transition-all duration-300 flex flex-col ${isExpanded ? "w-[280px] h-full" : "w-0 h-0 opacity-0 border-none"}`}
        style={isExpanded ? { background: "linear-gradient(180deg, rgba(255,255,255,.125) 0%, rgba(255,255,255,.135) 13%, rgba(255,255,255,.098) 34%, rgba(255,255,255,.092) 100%)", backdropFilter: "blur(18px) saturate(115%)", WebkitBackdropFilter: "blur(18px) saturate(115%)", border: "1px solid rgba(255,255,255,.20)" } : {}}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-white">
            <Layers className="w-4 h-4 text-[#C8FF3D]" />
            <span>3D Twin Layers</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white hover:text-[#C8FF3D] border border-transparent hover:border-white/10 transition flex items-center justify-center bg-white/5"
            title="Hide layers panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Basemap Style Switcher */}
        <div className="mb-2 pb-2 border-b border-white/10">
          <div className="text-[10px] font-mono text-white/50 uppercase font-semibold mb-1">
            Basemap Mode
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl border border-white/10 text-[10px] font-mono">
            <button
              onClick={() => setBasemapStyle("satellite")}
              className={`py-1 rounded-xl font-semibold transition ${
                (layers.basemapStyle || "satellite") === "satellite"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Street Map
            </button>
            <button
              onClick={() => setBasemapStyle("topo")}
              className={`py-1 rounded-xl font-semibold transition ${
                layers.basemapStyle === "topo"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Topo DEM
            </button>
            <button
              onClick={() => setBasemapStyle("dark")}
              className={`py-1 rounded-xl font-semibold transition ${
                layers.basemapStyle === "dark"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Tactical
            </button>
          </div>
        </div>

        {/* Layer Toggle Items */}
        <div className="flex flex-col gap-1.5 text-xs overflow-y-auto custom-scrollbar flex-1 pr-1">
          
          {/* 3D Falling Rain */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white">
              <CloudRain className="w-3.5 h-3.5 text-white animate-pulse" />
              <span className="font-semibold">3D Falling Rain</span>
            </div>
            <button
              onClick={() => toggleLayer("rain")}
              className={`p-1 rounded-xl ${layers.rain ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.rain ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Flood Inundation Surface */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              <span>Flood Inundation</span>
            </div>
            <button
              onClick={() => toggleLayer("water")}
              className={`p-1 rounded-xl ${layers.water ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.water ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* 3D Real City Buildings */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white">
              <Building2 className="w-3.5 h-3.5 text-[#C8FF3D]" />
              <span className="font-semibold">3D City Structures</span>
            </div>
            <button
              onClick={() => toggleLayer("buildings")}
              className={`p-1 rounded-xl ${layers.buildings ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.buildings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* 3D Road Blockages */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-sm bg-[#FF3B30] animate-ping" />
              <span className="font-semibold text-[#FF3B30]">3D Road Blockages</span>
            </div>
            <button
              onClick={() => toggleLayer("blockages")}
              className={`p-1 rounded-xl ${layers.blockages ? "text-[#FF3B30]" : "text-white/50"}`}
            >
              {layers.blockages ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Drainage Overflows */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Waves className="w-3.5 h-3.5 text-[#C8FF3D] animate-pulse" />
              <span>Drainage Overflows</span>
            </div>
            <button
              onClick={() => toggleLayer("overflows")}
              className={`p-1 rounded-xl ${layers.overflows ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.overflows ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Street Vehicles & Streetlights */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Car className="w-3.5 h-3.5 text-[#FFB347]" />
              <span>Street Traffic & Lamps</span>
            </div>
            <button
              onClick={() => toggleLayer("streetBuildings")}
              className={`p-1 rounded-xl ${layers.streetBuildings ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.streetBuildings ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Road Ribbons */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <span className="w-3.5 h-1.5 rounded-sm bg-[#C8FF3D]/10 inline-block" />
              <span>Road Network</span>
            </div>
            <button
              onClick={() => toggleLayer("roads")}
              className={`p-1 rounded-xl ${layers.roads ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.roads ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* D8 Flow Vectors */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Navigation className="w-3.5 h-3.5 text-white" />
              <span>Flow Vector Arrows</span>
            </div>
            <button
              onClick={() => toggleLayer("flowVectors")}
              className={`p-1 rounded-xl ${layers.flowVectors ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.flowVectors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Drainage Outfalls */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <span className="w-3.5 h-3.5 rounded-sm border-2 border-[#C8FF3D] inline-block" />
              <span>Drainage Outfalls</span>
            </div>
            <button
              onClick={() => toggleLayer("drainage")}
              className={`p-1 rounded-xl ${layers.drainage ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.drainage ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Critical Facilities */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Activity className="w-3.5 h-3.5 text-[#FF3B30]" />
              <span>Critical Hospitals</span>
            </div>
            <button
              onClick={() => toggleLayer("facilities")}
              className={`p-1 rounded-xl ${layers.facilities ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.facilities ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Terrain Layer */}
          <div className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/10 transition shrink-0">
            <div className="flex items-center gap-2 text-white/70">
              <Mountain className="w-3.5 h-3.5 text-[#FFB347]" />
              <span>Topographic DEM</span>
            </div>
            <button
              onClick={() => toggleLayer("terrain")}
              className={`p-1 rounded-xl ${layers.terrain ? "text-[#C8FF3D]" : "text-white/50"}`}
            >
              {layers.terrain ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Wireframe */}
          <div className="flex items-center justify-between p-1.5 pl-6 rounded-xl hover:bg-white/10 transition text-white/50">
            <span className="text-[11px]">Wireframe Mesh</span>
            <input
              type="checkbox"
              checked={layers.terrainWireframe}
              onChange={() => toggleLayer("terrainWireframe")}
              className="rounded-xl accent-[#C8FF3D] cursor-pointer"
            />
          </div>

        </div>

        {/* Vertical Elevation Exaggeration Slider */}
        <div className="mt-3 pt-2.5 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-1">
            <span className="flex items-center gap-1">
              <ChevronsUpDown className="w-3 h-3 text-[#C8FF3D]" />
              <span>Vertical Scale</span>
            </span>
            <span className="font-bold text-white">{layers.verticalScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={layers.verticalScale}
            onChange={(e) => handleVerticalScale(Number(e.target.value))}
            className="w-full h-1.5 rounded-xl appearance-none cursor-pointer accent-[#C8FF3D]"
          />
        </div>

        {/* Legend */}
        <div className="mt-3 pt-2.5 border-t border-white/10 text-[10px] text-white/50 flex flex-col gap-1.5">
          <span className="font-mono uppercase font-bold text-white/70">Depth / Disruption</span>
          
          {/* Gradient scale */}
          <div className="w-full h-2 rounded-xl bg-gradient-to-r from-[#C8FF3D] via-violet-500 to-[#FF3B30]" />
          <div className="flex justify-between font-mono text-[9px]">
            <span>0.05m (Watch)</span>
            <span>0.25m (High)</span>
            <span>&gt;0.40m (Critical)</span>
          </div>

          {/* Road status pins */}
          <div className="grid grid-cols-2 gap-1 mt-1 font-mono text-[9px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#C8FF3D]" /> Normal Free Flow
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#FFB347]" /> Speed Reduced
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#FFB347]" /> Severe Delays
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-[#FF3B30]" /> Impassable Cutoff
            </span>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
