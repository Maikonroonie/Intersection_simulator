import { Direction } from '../value-objects/Direction.js';
import { LaneType } from '../value-objects/TurnType.js';
import { SimulationConfig, DEFAULT_CONFIG } from '../value-objects/SimulationConfig.js';
import { Road } from '../entities/Road.js';
import { CollisionDetector, Phase } from './CollisionDetector.js';

export interface PhaseResult {
    phase: Phase;
    phaseIndex: number;
    totalPressure: number;
}

export class TrafficLightController {
    private readonly collisionDetector: CollisionDetector;
    private readonly config: SimulationConfig;
    private _currentPhaseIndex: number;
    private _currentPhaseDuration: number;

    constructor(config?: Partial<SimulationConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.collisionDetector = new CollisionDetector();
        this._currentPhaseIndex = -1;
        this._currentPhaseDuration = 0;
    }

    get currentPhaseIndex(): number {
        return this._currentPhaseIndex;
    }

    get currentPhaseDuration(): number {
        return this._currentPhaseDuration;
    }

    /**
     * Calculates traffic pressure for specific lanes of a road.
     * P_lane = length + waitTimeWeight × waitTime + emergencyWeight × emergencyCount
     */
    calculateLanePressure(road: Road, lanes: LaneType[]): number {
        let pressure = 0;
        for (const laneType of lanes) {
            const lane = road.getLane(laneType);
            pressure +=
                lane.length +
                this.config.waitTimeWeight * lane.getTotalWaitTime() +
                this.config.emergencyWeight * lane.getEmergencyCount();
        }
        return pressure;
    }

    /**
     * Calculates aggregate pressure for a full phase across all its maneuvers.
     */
    calculatePhasePressure(phase: Phase, roads: Map<Direction, Road>): number {
        let total = 0;
        for (const maneuver of phase.maneuvers) {
            const road = roads.get(maneuver.direction);
            if (road) {
                total += this.calculateLanePressure(road, maneuver.lanes);
            }
        }
        return total;
    }

    /**
     * Calculates total pressure for an entire road (all lanes aggregate).
     */
    calculateRoadPressure(road: Road): number {
        return (
            road.length +
            this.config.waitTimeWeight * road.getTotalWaitTime() +
            this.config.emergencyWeight * road.getEmergencyCount()
        );
    }

    private findEmergencyPhase(roads: Map<Direction, Road>): PhaseResult | null {
        const phases = this.collisionDetector.getValidPhases();
        let bestEmergency: PhaseResult | null = null;

        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            let hasEmergency = false;
            for (const maneuver of phase.maneuvers) {
                const road = roads.get(maneuver.direction);
                if (!road) continue;
                for (const laneType of maneuver.lanes) {
                    if (road.getLane(laneType).hasEmergencyVehicle()) {
                        hasEmergency = true;
                    }
                }
            }
            if (hasEmergency) {
                const pressure = this.calculatePhasePressure(phase, roads);
                if (!bestEmergency || pressure > bestEmergency.totalPressure) {
                    bestEmergency = { phase, phaseIndex: i, totalPressure: pressure };
                }
            }
        }

        return bestEmergency;
    }

    private checkStarvation(roads: Map<Direction, Road>): PhaseResult | null {
        for (const [direction, road] of roads) {
            if (road.isEmpty) continue;
            const maxWait = Math.max(...road.getVehicles().map((v) => v.waitTime));
            if (maxWait >= this.config.maxStarvationTime) {
                const matchingPhases = this.collisionDetector.findPhasesForDirection(direction);
                const allPhases = this.collisionDetector.getValidPhases();

                let bestPhase: PhaseResult | null = null;
                for (const phase of matchingPhases) {
                    const idx = allPhases.findIndex((p) => p.name === phase.name);
                    const pressure = this.calculatePhasePressure(phase, roads);
                    if (!bestPhase || pressure > bestPhase.totalPressure) {
                        bestPhase = { phase, phaseIndex: idx, totalPressure: pressure };
                    }
                }
                if (bestPhase) return bestPhase;
            }
        }
        return null;
    }

    private currentPhaseHasVehicles(roads: Map<Direction, Road>): boolean {
        if (this._currentPhaseIndex < 0) return false;
        const phases = this.collisionDetector.getValidPhases();
        const current = phases[this._currentPhaseIndex];
        if (!current) return false;

        for (const maneuver of current.maneuvers) {
            const road = roads.get(maneuver.direction);
            if (!road) continue;
            for (const laneType of maneuver.lanes) {
                if (!road.getLane(laneType).isEmpty) return true;
            }
        }
        return false;
    }

    /**
     * Main decision algorithm:
     * 1. Starvation prevention
     * 2. Emergency override minGreen
     * 3. Min green duration
     * 4. Best phase by pressure
     * 5. No vehicles → empty phase
     */
    calculateNextPhase(roads: Map<Direction, Road>): PhaseResult {
        const phases = this.collisionDetector.getValidPhases();

        const starvedPhase = this.checkStarvation(roads);
        if (starvedPhase) {
            this._applyPhase(starvedPhase.phaseIndex);
            return starvedPhase;
        }

        if (this.config.emergencyOverrideMinGreen) {
            const emergencyPhase = this.findEmergencyPhase(roads);
            if (emergencyPhase && emergencyPhase.phaseIndex !== this._currentPhaseIndex) {
                this._applyPhase(emergencyPhase.phaseIndex);
                return emergencyPhase;
            }
        }

        if (
            this._currentPhaseIndex >= 0 &&
            this._currentPhaseDuration < this.config.minGreenDuration &&
            this.currentPhaseHasVehicles(roads)
        ) {
            const current = phases[this._currentPhaseIndex];
            this._currentPhaseDuration++;
            return {
                phase: current,
                phaseIndex: this._currentPhaseIndex,
                totalPressure: this.calculatePhasePressure(current, roads),
            };
        }

        let bestResult: PhaseResult | null = null;
        for (let i = 0; i < phases.length; i++) {
            const pressure = this.calculatePhasePressure(phases[i], roads);
            if (!bestResult || pressure > bestResult.totalPressure) {
                bestResult = { phase: phases[i], phaseIndex: i, totalPressure: pressure };
            }
        }

        if (!bestResult || bestResult.totalPressure <= 0) {
            this._currentPhaseIndex = -1;
            this._currentPhaseDuration = 0;
            return {
                phase: { name: 'NONE', maneuvers: [] },
                phaseIndex: -1,
                totalPressure: 0,
            };
        }

        this._applyPhase(bestResult.phaseIndex);
        return bestResult;
    }

    private _applyPhase(phaseIndex: number): void {
        if (phaseIndex !== this._currentPhaseIndex) {
            this._currentPhaseIndex = phaseIndex;
            this._currentPhaseDuration = 1;
        } else {
            this._currentPhaseDuration++;
        }
    }
}
