'use client';

import React, { useEffect } from 'react';
import { useMap } from './Map';
import districtGeoJson from '@/data/geojson/india_districts.geojson';

import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { getMergedGeoJson } from './mergeGeojson';

interface RegimeLayerProps {
  forecasts: ForecastSnapshot[];
  visible?: boolean;
}

export const RegimeLayer: React.FC<RegimeLayerProps> = ({ forecasts, visible = true }) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceData = getMergedGeoJson(forecasts);

    if (!map.getSource('districts-regime-source')) {
      map.addSource('districts-regime-source', {
        type: 'geojson',
        data: sourceData,
      });
    } else {
      (map.getSource('districts-regime-source') as maplibregl.GeoJSONSource).setData(sourceData);
    }

    if (!map.getLayer('regime-boundary-lines')) {
      map.addLayer({
        id: 'regime-boundary-lines',
        type: 'line',
        source: 'districts-regime-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'regime'],
            'ACTIVE_MONSOON', '#C8FF3D',     // Chartreuse
            'BREAK_MONSOON', '#8D8B97',      // Smoke
            'MONSOON_DEPRESSION', '#FF3B30', // Signal Red
            'OROGRAPHIC', '#7968FF',         // Violet
            'COASTAL_CONVECTION', '#FFB347', // Amber
            'WESTERN_DISTURBANCE', '#A78BFA',
            '#4A4956'
          ],
          'line-width': 2.2,
          'line-opacity': visible ? 0.9 : 0,
        },
      });
    }
  }, [map, isLoaded, visible, forecasts]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (map.getLayer('regime-boundary-lines')) {
      map.setPaintProperty('regime-boundary-lines', 'line-opacity', visible ? 0.9 : 0);
    }
  }, [visible, map, isLoaded]);

  return null;
};
