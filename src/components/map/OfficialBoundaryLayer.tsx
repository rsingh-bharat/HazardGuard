'use client';

import React, { useEffect } from 'react';
import { useMap } from './Map';

export const OfficialBoundaryLayer: React.FC = () => {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    // We fetch the boundary JSON lazily
    Promise.all([
      fetch('/geojson/india_boundary.geojson').then(r => r.json()),
      fetch('/geojson/india_states.geojson').then(r => r.json()).catch(() => null)
    ])
    .then(([boundaryData, stateData]) => {
      // Find the correct layer to insert BEFORE so boundaries are BELOW the rainfall polygons
      let targetBeforeId = map.getLayer('district-rainfall-fill') ? 'district-rainfall-fill' : undefined;
      if (!targetBeforeId) {
        const layers = map.getStyle().layers;
        const firstSymbol = layers.find(l => l.type === 'symbol');
        if (firstSymbol) targetBeforeId = firstSymbol.id;
      }

      // Add Country Boundary Source
      if (!map.getSource('official-boundary-source')) {
        map.addSource('official-boundary-source', {
          type: 'geojson',
          data: boundaryData
        });
        
        // Outer thick line to mask the underlying basemap wrong borders
        map.addLayer({
          id: 'official-boundary-mask',
          type: 'line',
          source: 'official-boundary-source',
          paint: {
            'line-color': '#04121b', // Match dark matter background
            'line-width': 12,
            'line-blur': 4,
            'line-opacity': 1.0,
          }
        }, targetBeforeId);

        // Inner crisp line (Country Border)
        map.addLayer({
          id: 'official-boundary-line',
          type: 'line',
          source: 'official-boundary-source',
          paint: {
            'line-color': '#6b7280', // Lighter grey for country border
            'line-width': 1.8,
            'line-opacity': 0.9,
          }
        }, targetBeforeId);
      }

      // Add State Boundary Source
      if (stateData && !map.getSource('official-state-source')) {
        map.addSource('official-state-source', {
          type: 'geojson',
          data: stateData
        });

        // State crisp line (much lighter/thinner than country border)
        map.addLayer({
          id: 'official-state-line',
          type: 'line',
          source: 'official-state-source',
          paint: {
            'line-color': '#374151', // Darker/fainter grey for state borders
            'line-width': 1.0,
            'line-opacity': 0.6,
            'line-dasharray': [2, 2]
          }
        }, targetBeforeId);
      }
    })
    .catch(err => console.error('Failed to load official boundaries', err));
      
    // Hide CartoDB country boundaries AND specific labels
    const style = map.getStyle();
    if (style && style.layers) {
      style.layers.forEach((layer) => {
        // Hide admin/boundary lines
        if (layer.id.includes('admin') || layer.id.includes('boundary')) {
          try {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
          } catch (e) {}
        }
        
        // Filter out offending labels in place names
        if (layer.id.includes('place') && layer.type === 'symbol') {
          try {
            const currentFilter = map.getFilter(layer.id) || ['all'];
            // Classic mapbox filter syntax to exclude specific names
            map.setFilter(layer.id, [
              'all',
              currentFilter,
              ['!in', 'name', 'Azad Kashmir', 'Gilgit-Baltistan', 'Gilgit', 'Khyber Pakhtunkhwa'],
              ['!in', 'name_en', 'Azad Kashmir', 'Gilgit-Baltistan', 'Gilgit', 'Khyber Pakhtunkhwa']
            ] as any);
          } catch (e) {}
        }
      });
    }
  }, [map, isLoaded] as any);

  return null;
};

