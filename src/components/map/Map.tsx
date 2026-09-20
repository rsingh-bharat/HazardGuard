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

    instance.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'bottom-left');
    instance.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    instance.on('load', () => {
      setIsLoaded(true);

      // Add RainViewer Cloud Source & Layer
      if (!instance.getSource('rainviewer-clouds')) {
        instance.addSource('rainviewer-clouds', {
          type: 'raster',
          tiles: [MAP_CONFIG.rainViewerUrl],
          tileSize: 256,
          attribution: 'Â© RainViewer',
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
      // Odisha
      OR_PURI:              [85.8312, 19.8135],
      // Kerala
      KL_WAYANAD:           [76.1320, 11.6854],
      KL_ERNAKULAM:         [76.2999,  9.9816],
      // Assam
      AS_CACHAR:            [92.7789, 24.8333],
      // Gujarat
      GJ_VALSAD:            [72.9300, 20.6100],
      GJ_AHMEDABAD:         [72.5714, 23.0225],
      // Maharashtra
      MH_PUNE:              [73.8567, 18.5204],
      MH_MUMBAI:            [72.8777, 19.0760],
      MH_MUMBAI_CITY:       [72.8777, 19.0760],
      MH_MUMBAI_SUBURBAN:   [72.8777, 19.0760],
      MH_RATNAGIRI:         [73.3120, 16.9902],
      // Uttarakhand
      UT_DEHRADUN:          [78.0322, 30.3165],
      // Himachal Pradesh
      HP_MANDI:             [76.9320, 31.7087],
      // West Bengal
      WB_DARJEELING:        [88.2627, 27.0360],
      // Andhra Pradesh
      AP_VISAKHAPATNAM:     [83.2185, 17.6868],
      // Bihar
      BR_PATNA:             [85.1376, 25.5941],
      BR_SUPAUL:            [86.6053, 26.1260],
      // Madhya Pradesh
      MP_HOSHANGABAD:       [77.7200, 22.7500],
      MP_JABALPUR:          [79.9864, 23.1815],
      // Telangana
      TS_BHADRADRI:         [80.6200, 17.5500],
      TS_HYDERABAD:         [78.4867, 17.3850],
      // Tamil Nadu
      TN_NILGIRIS:          [76.6950, 11.4100],
      TN_CHENNAI:           [80.2707, 13.0827],
      // Karnataka
      KA_UDUPI:             [74.7421, 13.3409],
      KA_BENGALURU_URBAN:   [77.5946, 12.9716],
      KA_BLR_URBAN:         [77.5946, 12.9716],
      KA_BLR_RURAL:         [77.4200, 12.8000],
      // Rajasthan
      RJ_JAIPUR:            [75.7873, 26.9124],
      RJ_JODHPUR:           [73.0243, 26.2389],
      // Uttar Pradesh
      UP_LUCKNOW:           [80.9462, 26.8467],
      UP_VARANASI:          [82.9739, 25.3176],
      // Delhi
      DL_NEW_DELHI:         [77.2090, 28.6139],
      DL_CENTRAL_YAMUNA:    [77.2500, 28.6500],
      DL_NORTH_EAST:        [77.3000, 28.7000],
      // Punjab
      PB_LUDHIANA:          [75.8573, 30.9010],
      // Haryana
      HR_GURUGRAM:          [77.0266, 28.4595],
      // Jharkhand
      JH_RANCHI:            [85.3096, 23.3441],
      // Chhattisgarh
      CT_RAIPUR:            [81.6296, 21.2514],
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
      <div className="relative w-full h-full overflow-hidden select-none" style={{ background: '#04121b' }}>
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Aurora glass coordinate indicator */}
        <div
          className="absolute top-3 right-16 z-10 pointer-events-none flex items-center gap-1.5 px-2 py-1 text-[9px] font-mono"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.70)',
          }}
        >
          <Crosshair className="w-3 h-3" style={{ color: '#C8FF3D' }} />
          <span>GEO Â· EPSG:4326</span>
        </div>

        {/* Aurora loading state */}
        {!isLoaded && (
          <div
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(4,18,27,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          >
            <div
              className="flex flex-col items-center gap-4 p-8"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.258) 100%)',
                backdropFilter: 'blur(26px)',
                WebkitBackdropFilter: 'blur(26px)',
                border: '1px solid rgba(255,255,255,.20)',
                borderRadius: '20px',
              }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(255,255,255,.30)', borderTopColor: '#C8FF3D' }}
              />
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: 'rgba(255,255,255,.80)' }}>
                SYNCHRONIZING GEOSPATIAL TELEMETRY
              </span>
            </div>
          </div>
        )}
        {isLoaded && children}
      </div>
    </MapContext.Provider>
  );
};


