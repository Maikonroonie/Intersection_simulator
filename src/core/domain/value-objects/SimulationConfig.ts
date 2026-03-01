/**
 * All configurable simulation parameters in one place.
 * Every class accepts Partial<SimulationConfig> and merges with DEFAULT_CONFIG.
 */
export interface SimulationConfig {
    /** Max steps a vehicle can wait before its phase is forced (starvation prevention). */
    maxStarvationTime: number;
    /** Min steps a phase stays green before the controller considers switching. */
    minGreenDuration: number;
    /** Weight multiplier per emergency vehicle in the pressure formula. */
    emergencyWeight: number;
    /** Weight multiplier for total wait time in the pressure formula. */
    waitTimeWeight: number;
    /** If true, an emergency vehicle can override minGreenDuration and force a phase change. */
    emergencyOverrideMinGreen: boolean;
    /** Number of lanes per road (1 = single queue, 2 = left + straight/right). */
    laneCount: 1 | 2;
}

export const DEFAULT_CONFIG: SimulationConfig = {
    maxStarvationTime: 5,
    minGreenDuration: 3,
    emergencyWeight: 100,
    waitTimeWeight: 0.5,
    emergencyOverrideMinGreen: true,
    laneCount: 2,
};

/** Merge partial config with defaults. */
export function resolveConfig(partial?: Partial<SimulationConfig>): SimulationConfig {
    return { ...DEFAULT_CONFIG, ...partial };
}
