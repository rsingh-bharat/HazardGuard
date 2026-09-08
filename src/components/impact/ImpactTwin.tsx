'use client';

import React, { useEffect } from 'react';
import { useMap } from '@/components/map/Map';
import waterRiskGeoJson from '@/data/geojson/pune_water_risk.geojson';
import flowVectorsGeoJson from '@/data/geojson/pune_flow_vectors.geojson';
import { WaterFlowLegend } from './WaterFlowLegend';

interface ImpactTwinProps {
  simulationActive?: boolean;
}

export const ImpactTwin: React.FC<ImpactTwinProps> = ({ simulationActive = true }) => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Add Inundation Risk Polygons Source
    if (!map.getSource('water-risk-source')) {
      map.addSource('water-risk-source', {
        type: 'geojson',
        data: waterRiskGeoJson as any,
      });
    }

    // Add Flow Vectors Source
    if (!map.getSource('flow-vectors-source')) {
      map.addSource('flow-vectors-source', {
        type: 'geojson',
        data: flowVectorsGeoJson as any,
      });
    }

    // Inundation Layer
    if (!map.getLayer('water-risk-fill')) {
      map.addLayer({
        id: 'water-risk-fill',
        type: 'fill',
        source: 'water-risk-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'risk_level'],
            'CRITICAL', '#FF3B30',
            'HIGH', '#FFB347',
            'MODERATE', '#FFD166',
            '#7968FF'
          ],
          'fill-opacity': simulationActive ? 0.75 : 0,
        },
      });
    }

    if (!map.getLayer('water-risk-line')) {
      map.addLayer({
        id: 'water-risk-line',
        type: 'line',
        source: 'water-risk-source',
        paint: {
          'line-color': '#F1EEE8',
          'line-width': 1.8,
          'line-opacity': simulationActive ? 0.9 : 0,
        },
      });
    }

    // Flow Lines (Chartreuse vectors)
    if (!map.getLayer('flow-vectors-line')) {
      map.addLayer({
        id: 'flow-vectors-line',
        type: 'line',
        source: 'flow-vectors-source',
        paint: {
          'line-color': '#C8FF3D',
          'line-width': 3,
          'line-dasharray': [1, 2],
          'line-opacity': simulationActive ? 0.95 : 0,
        },
      });
    }
  }, [map, isLoaded, simulationActive]);

  useEffect(() => {
    if (!map || !isLoaded) return;
    if (map.getLayer('water-risk-fill')) {
      map.setPaintProperty('water-risk-fill', 'fill-opacity', simulationActive ? 0.75 : 0);
    }
    if (map.getLayer('water-risk-line')) {
      map.setPaintProperty('water-risk-line', 'line-opacity', simulationActive ? 0.9 : 0);
    }
    if (map.getLayer('flow-vectors-line')) {
      map.setPaintProperty('flow-vectors-line', 'line-opacity', simulationActive ? 0.95 : 0);
    }
  }, [simulationActive, map, isLoaded]);

  return <WaterFlowLegend />;
};
