'use client';

import React, { useEffect } from 'react';
import { useMap } from './Map';
import districtGeoJson from '@/data/geojson/india_districts.geojson';

import { ForecastSnapshot } from '@/lib/contracts/forecast';
import { getMergedGeoJson } from './mergeGeojson';

interface ProbabilityLayerProps {
  forecasts: ForecastSnapshot[];
  visible?: boolean;
}

export const ProbabilityLayer: React.FC<ProbabilityLayerProps> = ({ forecasts, visible = true }) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceData = getMergedGeoJson(forecasts);

    if (!map.getSource('districts-prob-source')) {
      map.addSource('districts-prob-source', {
        type: 'geojson',
        data: sourceData,
      });
    } else {
      (map.getSource('districts-prob-source') as maplibregl.GeoJSONSource).setData(sourceData);
    }

    if (!map.getLayer('heavy-rain-probability-fill')) {
      map.addLayer({
        id: 'heavy-rain-probability-fill',
        type: 'fill',
        source: 'districts-prob-source',
        paint: {
          'fill-color': [
            'step',
            ['get', 'p_heavy'],
            'rgba(0,0,0,0)',
            0.25,
            'rgba(255, 209, 102, 0.35)', // Yellow amber
            0.5,
            'rgba(255, 179, 71, 0.55)',  // Amber caution
            0.75,
            'rgba(255, 59, 48, 0.75)',   // Signal Red alarm
          ],
          'fill-opacity': visible ? 0.75 : 0,
        },
      });
    }

    if (!map.getLayer('heavy-rain-probability-line')) {
      map.addLayer({
        id: 'heavy-rain-probability-line',
        type: 'line',
        source: 'districts-prob-source',
        paint: {
          'line-color': '#FFB347',
          'line-width': 1.5,
          'line-dasharray': [3, 2],
          'line-opacity': visible ? 0.9 : 0,
        },
      });
    }
  }, [map, isLoaded, visible, forecasts]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (map.getLayer('heavy-rain-probability-fill')) {
      map.setPaintProperty('heavy-rain-probability-fill', 'fill-opacity', visible ? 0.75 : 0);
    }
    if (map.getLayer('heavy-rain-probability-line')) {
      map.setPaintProperty('heavy-rain-probability-line', 'line-opacity', visible ? 0.9 : 0);
    }
  }, [visible, map, isLoaded]);

  return null;
};
