'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMap } from './Map';

// Mock wind alert points (critical wind zones over India)
const WIND_ALERT_POINTS = [
  { lng: 73.8567, lat: 18.5204, speed: 0.9, label: 'PUNE · 38 KT', alertLevel: 'ORANGE' },
  { lng: 85.8312, lat: 19.8135, speed: 1.0, label: 'PURI · 52 KT', alertLevel: 'RED' },
  { lng: 76.132,  lat: 11.6854, speed: 0.85, label: 'WAYANAD · 44 KT', alertLevel: 'RED' },
  { lng: 72.93,   lat: 20.61,   speed: 0.95, label: 'VALSAD · 48 KT', alertLevel: 'RED' },
  { lng: 92.7789, lat: 24.8333, speed: 0.65, label: 'CACHAR · 28 KT', alertLevel: 'YELLOW' },
  { lng: 88.2627, lat: 27.036,  speed: 0.75, label: 'DARJEELING · 35 KT', alertLevel: 'ORANGE' },
  { lng: 83.2185, lat: 17.6868, speed: 0.7, label: 'VISAKHA · 32 KT', alertLevel: 'YELLOW' },
];

interface WindStreamLayerProps {
  visible?: boolean;
}

export const WindStreamLayer: React.FC<WindStreamLayerProps> = ({ visible = false }) => {
  const { map, isLoaded } = useMap();
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Cleanup helper
  const cleanup = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  useEffect(() => {
    if (!map || !isLoaded) { cleanup(); return; }
    if (!visible) { cleanup(); return; }

    // Animation mode is handled by AnimationOverlay.tsx
    // STATIC MODE: show alert markers at critical wind points
    WIND_ALERT_POINTS.forEach((pt) => {
      const el = document.createElement('div');
      el.style.cssText = `
        background: rgba(11,11,13,0.92);
        border: 1px solid rgba(200,255,61,0.7);
        color: #C8FF3D;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 9px;
        font-weight: 700;
        padding: 3px 6px;
        white-space: nowrap;
        letter-spacing: 0.05em;
        box-shadow: 0 0 8px rgba(200,255,61,0.25);
        pointer-events: none;
      `;
      el.innerHTML = `<span style="margin-right:4px;">↗</span>${pt.label}`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      cleanup();
    };
  }, [map, isLoaded, visible]);

  return null;
};
