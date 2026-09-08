'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_CONFIG } from '@/lib/layers/layerConfig';
import { LayerId } from '@/lib/layers/layerRegistry';
import { Crosshair, Radio } from 'lucide-react';

interface MapContextType {
  map: MapLibreMap | null;
  isLoaded: boolean;
}

const MapContext = createContext<MapContextType>({ map: null, isLoaded: false });

export const useMap = () => useContext(MapContext);

interface MapProps {
  activeLayers?: LayerId[];
  selectedDistrictId?: string | null;
  onDistrictClick?: (districtId: string) => void;
  enable3DTerrain?: boolean;
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  children?: React.ReactNode;
}

export const Map: React.FC<MapProps> = ({
  activeLayers = ['rainfall'],
  selectedDistrictId,
  onDistrictClick,
  enable3DTerrain = false,
  center = MAP_CONFIG.initialCenter,
  zoom = MAP_CONFIG.initialZoom,
  pitch = 0,
  bearing = 0,
  children,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const instance = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.darkStyle,
      center,
      zoom,
      pitch,
      bearing,
      antialias: true,
    });

    instance.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
    instance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    instance.on('load', () => {
      setIsLoaded(true);

      // Add RainViewer Cloud Source & Layer
      if (!instance.getSource('rainviewer-clouds')) {
        instance.addSource('rainviewer-clouds', {
          type: 'raster',
          tiles: [MAP_CONFIG.rainViewerUrl],
          tileSize: 256,
          attribution: '© RainViewer',
        });

        instance.addLayer({
          id: 'rainviewer-cloud-layer',
          type: 'raster',
          source: 'rainviewer-clouds',
          paint: {
            'raster-opacity': 0.45,
          },
          layout: {
            visibility: 'none',
          },
        });
      }
    });

    setMap(instance);

    return () => {
      instance.remove();
      setMap(null);
      setIsLoaded(false);
    };
  }, []);

  // Update RainViewer Cloud Visibility
  useEffect(() => {
    if (!map || !isLoaded) return;
    const isCloudActive = activeLayers.includes('rainviewerCloud');
    if (map.getLayer('rainviewer-cloud-layer')) {
      map.setLayoutProperty(
        'rainviewer-cloud-layer',
        'visibility',
        isCloudActive ? 'visible' : 'none'
      );
    }
  }, [activeLayers, map, isLoaded]);

  // Fly to selected district if updated
  useEffect(() => {
    if (!map || !selectedDistrictId) return;

    const districtCoords: Record<string, [number, number]> = {
      MH_PUNE: [73.8567, 18.5204],
      MH_MUMBAI: [72.8777, 19.076],
      OR_PURI: [85.8312, 19.8135],
      KL_WAYANAD: [76.132, 11.6854],
      GJ_VALSAD: [72.93, 20.61],
      AS_CACHAR: [92.7789, 24.8333],
      UT_DEHRADUN: [78.0322, 30.3165],
      HP_MANDI: [76.932, 31.7087],
      WB_DARJEELING: [88.2627, 27.036],
      AP_VISAKHAPATNAM: [83.2185, 17.6868],
      KL_ERNAKULAM: [76.2999, 9.9816],
      BR_PATNA: [85.1376, 25.5941],
      TS_HYDERABAD: [78.4867, 17.385],
      TN_CHENNAI: [80.2707, 13.0827],
      KA_BENGALURU_URBAN: [77.5946, 12.9716],
    };

    const target = districtCoords[selectedDistrictId.toUpperCase()];
    if (target) {
      map.flyTo({
        center: target,
        zoom: enable3DTerrain ? 10.5 : 8.0,
        pitch: enable3DTerrain ? 55 : 0,
        duration: 1800,
        essential: true,
      });
    }
  }, [selectedDistrictId, map, enable3DTerrain]);

  return (
    <MapContext.Provider value={{ map, isLoaded }}>
      <div className="relative w-full h-full bg-graphite-950 overflow-hidden select-none">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Tactical Crosshair Overlay */}
        <div className="absolute top-3 right-14 z-10 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 bg-graphite-950/80 border border-graphite-700 text-[9px] font-mono text-smoke">
          <Crosshair className="w-3 h-3 text-chartreuse" />
          <span>GEO_GRID // 4326</span>
        </div>

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-graphite-950/90 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-3 border border-graphite-700 bg-graphite-900 p-6 shadow-2xl">
              <div className="w-8 h-8 border-2 border-chartreuse border-t-transparent rounded-none animate-spin" />
              <span className="text-xs font-mono text-paper tracking-widest uppercase">
                SYNCHRONIZING GEOSPATIAL TELEMETRY...
              </span>
            </div>
          </div>
        )}
        {isLoaded && children}
      </div>
    </MapContext.Provider>
  );
};
