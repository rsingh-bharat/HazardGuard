import { ScenarioType } from './impact';

export interface ScenarioDefinition {
  id: ScenarioType;
  label: string;
  description: string;
  multiplier: number;
  confidencePercentile: number;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'LOW',
    label: 'LOW (Optimistic / Low Impact)',
    description: 'Low-impact deterministic scenario — localized runoff advisory',
    multiplier: 0.7,
    confidencePercentile: 10,
  },
  {
    id: 'BASE',
    label: 'BASE (Operational / Median Impact)',
    description: 'Base deterministic scenario — operational standard advisory',
    multiplier: 1.0,
    confidencePercentile: 50,
  },
  {
    id: 'HIGH',
    label: 'HIGH (Severe / Elevated Impact)',
    description: 'High-impact deterministic envelope — emergency preparedness trigger',
    multiplier: 1.35,
    confidencePercentile: 90,
  },
  {
    id: 'CUSTOM',
    label: 'Custom Simulation',
    description: 'User-specified precipitation depth and duration parameters',
    multiplier: 1.0,
    confidencePercentile: 0,
  },
];
