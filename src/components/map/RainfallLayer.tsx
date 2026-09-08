'use client';

import React, { useEffect, useRef } from 'react';
import { useMap } from './Map';
import maplibregl from 'maplibre-gl';
import districtGeoJson from '@/data/geojson/india_districts.geojson';
import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { getMergedGeoJson } from './mergeGeojson';

interface RainfallLayerProps {
  forecasts: ForecastSnapshot[];
  onDistrictClick?: (districtId: string) => void;
  visible?: boolean;
  showAnimation?: boolean;
}

// Mock alert intensity per district centroid for rain animation
// format: [lng, lat, intensityFactor (0-1 relative to max)]
const ALERT_CENTROIDS: Array<{ lng: number; lat: number; intensity: number; alertLevel: string }> = [
  { lng: 73.8567, lat: 18.5204, intensity: 0.7, alertLevel: 'ORANGE' },  // Pune, MH
  { lng: 85.8312, lat: 19.8135, intensity: 1.0, alertLevel: 'RED' },     // Puri, OR
  { lng: 76.132,  lat: 11.6854, intensity: 0.95, alertLevel: 'RED' },    // Wayanad, KL
  { lng: 72.93,   lat: 20.61,   intensity: 0.98, alertLevel: 'RED' },    // Valsad, GJ
  { lng: 92.7789, lat: 24.8333, intensity: 0.65, alertLevel: 'ORANGE' }, // Cachar, AS
  { lng: 78.0322, lat: 30.3165, intensity: 0.55, alertLevel: 'YELLOW' }, // Dehradun, UT
  { lng: 76.932,  lat: 31.7087, intensity: 0.5,  alertLevel: 'YELLOW' }, // Mandi, HP
  { lng: 88.2627, lat: 27.036,  intensity: 0.75, alertLevel: 'ORANGE' }, // Darjeeling, WB
  { lng: 83.2185, lat: 17.6868, intensity: 0.72, alertLevel: 'ORANGE' }, // Visakhapatnam, AP
  { lng: 76.2999, lat: 9.9816,  intensity: 0.6,  alertLevel: 'YELLOW' }, // Ernakulam, KL
  { lng: 85.1376, lat: 25.5941, intensity: 0.62, alertLevel: 'YELLOW' }, // Patna, BR
];

export const RainfallLayer: React.FC<RainfallLayerProps> = ({ forecasts, onDistrictClick, visible = true, showAnimation = false }) => {
  const { map, isLoaded } = useMap();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // MapLibre choropleth + outline layers
  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceData = getMergedGeoJson(forecasts);

    if (!map.getSource('districts-source')) {
      map.addSource('districts-source', {
        type: 'geojson',
        data: sourceData,
      });
    } else {
      (map.getSource('districts-source') as maplibregl.GeoJSONSource).setData(sourceData);
    }

    if (!map.getLayer('district-rainfall-fill')) {
      map.addLayer({
        id: 'district-rainfall-fill',
        type: 'fill',
        source: 'districts-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'alert_level'],
            'RED', '#FF3B30',
            'ORANGE', '#FFB347',
            'YELLOW', '#FFD166',
            'GREEN', '#C8FF3D',
            '#8D8B97'
          ],
          'fill-opacity': visible ? 0.65 : 0,
        },
      });
    }

    if (!map.getLayer('district-rainfall-line')) {
      map.addLayer({
        id: 'district-rainfall-line',
        type: 'line',
        source: 'districts-source',
        paint: {
          'line-color': '#0B0B0D',
          'line-width': 1.5,
          'line-opacity': visible ? 0.9 : 0,
        },
      });
    }

    if (!map.getLayer('district-red-alert-pulse')) {
      map.addLayer({
        id: 'district-red-alert-pulse',
        type: 'circle',
        source: 'districts-source',
        filter: ['==', ['get', 'alert_level'], 'RED'],
        paint: {
          'circle-radius': 12,
          'circle-color': '#FF3B30',
          'circle-opacity': visible ? 0.45 : 0,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#F1EEE8',
          'circle-stroke-opacity': visible ? 0.9 : 0,
        },
      });
    }

    // Tactical Tooltip
    popupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
    });

    const onMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      map.getCanvas().style.cursor = 'crosshair';

      const props = e.features[0].properties;
      const alertHex =
        props.alert_level === 'RED'
          ? '#FF3B30'
          : props.alert_level === 'ORANGE'
          ? '#FFB347'
          : props.alert_level === 'YELLOW'
          ? '#FFD166'
          : '#C8FF3D';

      const html = `
        <div style="padding: 8px 12px; background: #111115; color: #F1EEE8; border-radius: 0px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; border: 1px solid #32313D; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; color: #F1EEE8; text-transform: uppercase;">
            ${props.district_name} // ${props.state_name}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; gap: 12px;">
            <span style="color: #C7C2BC;">PRECIP: <b style="color: ${alertHex};">${props.corrected_mm} mm</b></span>
            <span style="background: ${alertHex}; color: #0B0B0D; padding: 1px 6px; font-weight: 800; font-size: 10px; letter-spacing: 0.05em;">${props.alert_level}</span>
          </div>
          <div style="font-size: 9px; color: #8D8B97; margin-top: 4px; border-top: 1px solid #202026; padding-top: 4px;">
            SYNOPTIC: ${props.regime}
          </div>
        </div>
      `;

      popupRef.current?.setLngLat(e.lngLat).setHTML(html).addTo(map);
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    };

    const onClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const districtId = e.features[0].properties.district_id;
      if (districtId && onDistrictClick) {
        onDistrictClick(districtId);
      }
    };

    map.on('mousemove', 'district-rainfall-fill', onMouseMove);
    map.on('mouseleave', 'district-rainfall-fill', onMouseLeave);
    map.on('click', 'district-rainfall-fill', onClick);

    return () => {
      popupRef.current?.remove();
      map.off('mousemove', 'district-rainfall-fill', onMouseMove);
      map.off('mouseleave', 'district-rainfall-fill', onMouseLeave);
      map.off('click', 'district-rainfall-fill', onClick);
    };
  }, [map, isLoaded, onDistrictClick, visible, forecasts]);

  // Update choropleth visibility
  useEffect(() => {
    if (!map || !isLoaded) return;
    if (map.getLayer('district-rainfall-fill')) {
      map.setPaintProperty('district-rainfall-fill', 'fill-opacity', visible ? 0.65 : 0);
    }
    if (map.getLayer('district-rainfall-line')) {
      map.setPaintProperty('district-rainfall-line', 'line-opacity', visible ? 0.9 : 0);
    }
    if (map.getLayer('district-red-alert-pulse')) {
      map.setPaintProperty('district-red-alert-pulse', 'circle-opacity', visible ? 0.45 : 0);
      map.setPaintProperty('district-red-alert-pulse', 'circle-stroke-opacity', visible ? 0.9 : 0);
    }
  }, [visible, map, isLoaded]);

  // Animation handled by AnimationOverlay.tsx


  return null;
};
