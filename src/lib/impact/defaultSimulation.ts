import rawData from "./initialSimulation.json";
import { ImpactSimulationResult } from "@/lib/contracts/impact";

export const defaultSimulation: ImpactSimulationResult = rawData as unknown as ImpactSimulationResult;
