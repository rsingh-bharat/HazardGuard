export const LAYER_REGISTRY = {
  forecast: ['rainfall', 'heavyRainProbability', 'weatherRegime', 'uncertainty'],
  terrain: ['elevation', 'slope'],
  impact: ['waterRisk', 'flowDirection', 'roads', 'buildings', 'rivers', 'population'],
  context: ['satellite', 'rainviewerCloud', 'windStreamlines', 'earthquake', 'wildfire'],
} as const;

export type LayerGroup = keyof typeof LAYER_REGISTRY;
export type LayerId = (typeof LAYER_REGISTRY)[LayerGroup][number];

export interface LayerConfig {
  id: LayerId;
  label: string;
  group: LayerGroup;
  category: 'hazard' | 'weather' | 'impact' | 'base';
  defaultVisible: boolean;
  description: string;
}

export const AVAILABLE_LAYERS: LayerConfig[] = [
  // Hazard Group
  {
    id: 'rainfall',
    label: 'Rain Alert Choropleth',
    group: 'forecast',
    category: 'hazard',
    defaultVisible: true,
    description: 'IMD color-coded district warning levels (Red/Orange/Yellow/Green)',
  },
  {
    id: 'waterRisk',
    label: 'Flood Inundation Risk',
    group: 'impact',
    category: 'hazard',
    defaultVisible: false,
    description: '3D DEM-derived surface water accumulation zones',
  },
  {
    id: 'earthquake',
    label: 'Earthquake Feed (USGS)',
    group: 'context',
    category: 'hazard',
    defaultVisible: false,
    description: 'Live seismic events and tectonic fault lines',
  },
  {
    id: 'wildfire',
    label: 'Wildfire Thermal (FIRMS)',
    group: 'context',
    category: 'hazard',
    defaultVisible: false,
    description: 'NASA FIRMS active fire hotspots',
  },

  // Weather Group
  {
    id: 'rainviewerCloud',
    label: 'Cloud Radar (RainViewer)',
    group: 'context',
    category: 'weather',
    defaultVisible: false,
    description: 'Real-time satellite cloud cover imagery',
  },
  {
    id: 'windStreamlines',
    label: 'Wind Streamlines (850hPa)',
    group: 'context',
    category: 'weather',
    defaultVisible: false,
    description: 'Low-level monsoon jet stream vector streamlines',
  },
  {
    id: 'heavyRainProbability',
    label: 'Heavy Rain Iso-Probability',
    group: 'forecast',
    category: 'weather',
    defaultVisible: false,
    description: 'P(Rainfall > 64.5mm) contour probability gradients',
  },
  {
    id: 'weatherRegime',
    label: 'Weather Regime Boundaries',
    group: 'forecast',
    category: 'weather',
    defaultVisible: false,
    description: 'Synoptic weather regime classification envelopes',
  },
  {
    id: 'flowDirection',
    label: 'Hydrological Flow Vectors',
    group: 'impact',
    category: 'hazard',
    defaultVisible: false,
    description: 'DEM downhill drainage flow vectors',
  },
];
