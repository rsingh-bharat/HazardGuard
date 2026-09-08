'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './Map';

interface HazardMarkersLayerProps {
  activeLayers: string[];
}

// Mock hazard locations
const HAZARDS = [
  { id: 'f1', type: 'flood', lat: 26.14, lng: 91.73, name: 'Guwahati Flash Flood' },
  { id: 'f2', type: 'flood', lat: 25.59, lng: 85.13, name: 'Patna River Overflow' },
  { id: 'e1', type: 'earthquake', lat: 27.71, lng: 85.32, name: 'Kathmandu M5.2' },
  { id: 'e2', type: 'earthquake', lat: 24.8, lng: 93.93, name: 'Imphal Tremor' },
  { id: 'w1', type: 'wildfire', lat: 30.31, lng: 78.03, name: 'Dehradun Forest Fire' },
  { id: 'w2', type: 'wildfire', lat: 31.10, lng: 77.17, name: 'Shimla Bush Fire' },
];

export const HazardMarkersLayer: React.FC<HazardMarkersLayerProps> = ({ activeLayers }) => {
  const { map, isLoaded } = useMap();
  const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({});

  useEffect(() => {
    if (!map || !isLoaded) return;

    const showFlood = activeLayers.includes('waterRisk');
    const showEarthquake = activeLayers.includes('earthquake');
    const showWildfire = activeLayers.includes('wildfire');

    HAZARDS.forEach(hazard => {
      const isVisible =
        (hazard.type === 'flood' && showFlood) ||
        (hazard.type === 'earthquake' && showEarthquake) ||
        (hazard.type === 'wildfire' && showWildfire);

      if (isVisible) {
        if (!markersRef.current[hazard.id]) {
          const el = document.createElement('div');
          el.className = 'flex flex-col items-center justify-center';
          
          let color = '#3B82F6'; // default blue
          let shadow = 'rgba(59, 130, 246, 0.5)';
          if (hazard.type === 'flood') {
            color = '#06B6D4'; // Cyan
            shadow = 'rgba(6, 182, 212, 0.5)';
          } else if (hazard.type === 'earthquake') {
            color = '#8B5CF6'; // Purple
            shadow = 'rgba(139, 92, 246, 0.5)';
          } else if (hazard.type === 'wildfire') {
            color = '#F59E0B'; // Bright Orange/Yellow
            shadow = 'rgba(245, 158, 11, 0.5)';
          }

          el.innerHTML = `
            <div style="width: 14px; height: 14px; background: ${color}; border: 2px solid #111115; border-radius: 50%; box-shadow: 0 0 10px ${shadow}, inset 0 0 4px rgba(0,0,0,0.5);"></div>
            <div style="margin-top: 4px; background: rgba(11, 11, 13, 0.9); padding: 2px 4px; border: 1px solid ${color}; color: ${color}; font-size: 9px; font-family: monospace; white-space: nowrap;">
              ${hazard.name}
            </div>
          `;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([hazard.lng, hazard.lat])
            .addTo(map);
          markersRef.current[hazard.id] = marker;
        }
      } else {
        if (markersRef.current[hazard.id]) {
          markersRef.current[hazard.id].remove();
          delete markersRef.current[hazard.id];
        }
      }
    });

    return () => {
      // Cleanup happens via refs on unmount, but leave them during normal updates if still visible
    };
  }, [map, isLoaded, activeLayers]);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
    };
  }, []);

  return null;
};
