import { ImpactSimulationResult, ScenarioType } from "@/lib/contracts/impact";
import { defaultSimulation } from "./defaultSimulation";

/**
 * Client-side mock simulation is strictly disabled to prevent fabricated consequence risks.
 */
export function generateClientSimulation(
  scenarioType: ScenarioType,
  rainfallMm: number,
  baseResult: ImpactSimulationResult = defaultSimulation
): ImpactSimulationResult {
  throw new Error(
    "Security Violation: Client-side mock physics and fabricated exposure are disabled. " +
    "Must use live Soumy backend for all consequence modeling to preserve fail-closed integrity."
  );
}
