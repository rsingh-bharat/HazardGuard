'use client';

import React, { useEffect } from 'react';
import { useMap } from './Map';

interface InfrastructureLayerProps {
  visible?: boolean;
}

const sampleAssets = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Sassoon General Hospital', type: 'HOSPITAL', criticality: 'CRITICAL' },
      geometry: { type: 'Point', coordinates: [73.8742, 18.5284] },
    },
    {
      type: 'Feature',
      properties: { name: 'Deenanath Mangeshkar Hospital', type: 'HOSPITAL', criticality: 'HIGH' },
      geometry: { type: 'Point', coordinates: [73.8291, 18.5015] },
    },
    {
      type: 'Feature',
      properties: { name: 'MSEB 220kV Substation Parvati', type: 'POWER', criticality: 'CRITICAL' },
      geometry: { type: 'Point', coordinates: [73.8475, 18.496] },
    },
    {
      type: 'Feature',
      properties: { name: 'Sangam Bridge Confluence Overpass', type: 'BRIDGE', criticality: 'HIGH' },
      geometry: { type: 'Point', coordinates: [73.864, 18.532] },
    },
  ],
};

export const InfrastructureLayer: React.FC<InfrastructureLayerProps> = ({ visible = false }) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (!map.getSource('infra-assets-source')) {
      map.addSource('infra-assets-source', {
        type: 'geojson',
        data: sampleAssets as any,
      });
    }

    if (!map.getLayer('infra-assets-circle')) {
      map.addLayer({
        id: 'infra-assets-circle',
        type: 'circle',
        source: 'infra-assets-source',
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'match',
            ['get', 'type'],
            'HOSPITAL', '#FF3B30',  // Signal Red
            'POWER', '#FFB347',     // Amber
            'BRIDGE', '#7968FF',    // Violet
            '#C8FF3D'               // Chartreuse
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#F1EEE8',
          'circle-opacity': visible ? 0.95 : 0,
          'circle-stroke-opacity': visible ? 1 : 0,
        },
      });
    }
  }, [map, isLoaded, visible]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (map.getLayer('infra-assets-circle')) {
      map.setPaintProperty('infra-assets-circle', 'circle-opacity', visible ? 0.95 : 0);
      map.setPaintProperty('infra-assets-circle', 'circle-stroke-opacity', visible ? 1 : 0);
    }
  }, [visible, map, isLoaded]);

  return null;
};
