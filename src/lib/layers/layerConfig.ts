export const MAP_CONFIG = {
  initialCenter: [78.9629, 20.5937] as [number, number],
  initialZoom: 4.5,
  minZoom: 3,
  maxZoom: 16,
  darkStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satelliteStyle: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  rainViewerUrl: 'https://tilecache.rainviewer.com/v2/satellite/latest/256/{z}/{x}/{y}/0/0_0.png',
};

export const ALERT_COLORS = {
  RED: '#FF3B30',      // Signal Red
  ORANGE: '#FFB347',   // Amber
  YELLOW: '#FFD166',   // Yellow
  GREEN: '#C8FF3D',    // Chartreuse
};

export const REGIME_COLORS: Record<string, string> = {
  ACTIVE_MONSOON: '#C8FF3D',     // Chartreuse
  BREAK_MONSOON: '#8D8B97',      // Smoke
  MONSOON_DEPRESSION: '#FF3B30', // Signal Red
  OROGRAPHIC: '#7968FF',         // Violet
  COASTAL_CONVECTION: '#FFB347', // Amber
  WESTERN_DISTURBANCE: '#A78BFA',// Violet light
};
