import { useReducer, useCallback, useRef } from 'react';
import type { Direction, Vehicle, RoadState, SimulationState, LogEntry, LaneType } from '../types';
import { determineLane } from '../types';

interface Maneuver {
    direction: Direction;
    lanes: LaneType[];
}

interface Phase {
    name: string;
    maneuvers: Maneuver[];
}

interface LaneInternal {
    type: LaneType;
    vehicles: Vehicle[];
}

interface RoadInternal {
    lanes: LaneInternal[];
    lightState: 'green' | 'red';
}

interface SimConfig {
    minGreenDuration: number;
    maxStarvationTime: number;
    emergencyWeight: number;
    waitTimeWeight: number;
    emergencyOverrideMinGreen: boolean;
}

interface State {
    roads: Record<Direction, RoadInternal>;
    stepCount: number;
    activePhase: Direction[];
    log: LogEntry[];
    laneCount: number;
    currentPhaseIndex: number;
    currentPhaseDuration: number;
    config: SimConfig;
}

type Action =
    | { type: 'ADD_VEHICLE'; vehicle: Vehicle; startRoad: Direction }
    | { type: 'STEP' }
    | { type: 'RESET' }
    | { type: 'SET_LANES'; count: number }
    | { type: 'SET_CONFIG'; config: Partial<SimConfig> };

const ALL_DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

const PHASES: Phase[] = [
    {
        name: 'NS_MAIN',
        maneuvers: [
            { direction: 'north', lanes: ['straight_right'] },
            { direction: 'south', lanes: ['straight_right'] },
        ],
    },
    {
        name: 'NS_LEFT',
        maneuvers: [
            { direction: 'north', lanes: ['left'] },
            { direction: 'south', lanes: ['left'] },
        ],
    },
    {
        name: 'EW_MAIN',
        maneuvers: [
            { direction: 'east', lanes: ['straight_right'] },
            { direction: 'west', lanes: ['straight_right'] },
        ],
    },
    {
        name: 'EW_LEFT',
        maneuvers: [
            { direction: 'east', lanes: ['left'] },
            { direction: 'west', lanes: ['left'] },
        ],
    },
];

const DEFAULT_CONFIG: SimConfig = {
    minGreenDuration: 3,
    maxStarvationTime: 5,
    emergencyWeight: 100,
    waitTimeWeight: 0.5,
    emergencyOverrideMinGreen: true,
};

function createLanes(count: number): LaneInternal[] {
    if (count === 1) {
        return [{ type: 'straight_right', vehicles: [] }];
    }
    return [
        { type: 'left', vehicles: [] },
        { type: 'straight_right', vehicles: [] },
    ];
}

function createEmptyRoads(laneCount: number): Record<Direction, RoadInternal> {
    return {
        north: { lanes: createLanes(laneCount), lightState: 'red' },
        south: { lanes: createLanes(laneCount), lightState: 'red' },
        east: { lanes: createLanes(laneCount), lightState: 'red' },
        west: { lanes: createLanes(laneCount), lightState: 'red' },
    };
}

function getLaneVehicles(road: RoadInternal, laneType: LaneType): Vehicle[] {
    const lane = road.lanes.find((l) => l.type === laneType);
    return lane ? lane.vehicles : [];
}

function getAllVehicles(road: RoadInternal): Vehicle[] {
    return road.lanes.flatMap((l) => l.vehicles);
}

function getRoadVehicleCount(road: RoadInternal): number {
    return road.lanes.reduce((sum, l) => sum + l.vehicles.length, 0);
}

function calcLanePressure(road: RoadInternal, lanes: LaneType[], config: SimConfig): number {
    let pressure = 0;
    for (const lt of lanes) {
        const vehicles = getLaneVehicles(road, lt);
        const emerCount = vehicles.filter((v) => v.isEmergency).length;
        pressure +=
            vehicles.length +
            config.waitTimeWeight * vehicles.reduce((s, v) => s + v.waitTime, 0) +
            config.emergencyWeight * emerCount;
    }
    return pressure;
}

function calcPhasePressure(phase: Phase, roads: Record<Direction, RoadInternal>, config: SimConfig): number {
    let total = 0;
    for (const m of phase.maneuvers) total += calcLanePressure(roads[m.direction], m.lanes, config);
    return total;
}

function phaseHasVehicles(phase: Phase, roads: Record<Direction, RoadInternal>): boolean {
    for (const m of phase.maneuvers) {
        for (const lt of m.lanes) {
            if (getLaneVehicles(roads[m.direction], lt).length > 0) return true;
        }
    }
    return false;
}

function phaseHasEmergency(phase: Phase, roads: Record<Direction, RoadInternal>): boolean {
    for (const m of phase.maneuvers) {
        for (const lt of m.lanes) {
            if (getLaneVehicles(roads[m.direction], lt).some((v) => v.isEmergency)) return true;
        }
    }
    return false;
}

function initialState(): State {
    return {
        roads: createEmptyRoads(2),
        stepCount: 0,
        activePhase: [],
        log: [],
        laneCount: 2,
        currentPhaseIndex: -1,
        currentPhaseDuration: 0,
        config: { ...DEFAULT_CONFIG },
    };
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SET_CONFIG':
            return { ...state, config: { ...state.config, ...action.config } };

        case 'SET_LANES':
            return {
                ...initialState(),
                laneCount: action.count,
                roads: createEmptyRoads(action.count),
                config: state.config,
            };

        case 'ADD_VEHICLE': {
            const { vehicle, startRoad } = action;
            const road = state.roads[startRoad];

            let targetLaneIdx = 0;
            if (state.laneCount === 2) {
                targetLaneIdx = road.lanes.findIndex((l) => l.type === vehicle.lane);
                if (targetLaneIdx === -1) targetLaneIdx = road.lanes.findIndex((l) => l.type === 'straight_right');
                if (targetLaneIdx === -1) targetLaneIdx = 0;
            }

            const newLanes = road.lanes.map((lane, i) =>
                i === targetLaneIdx ? { ...lane, vehicles: [...lane.vehicles, vehicle] } : lane,
            );

            return {
                ...state,
                roads: { ...state.roads, [startRoad]: { ...road, lanes: newLanes } },
            };
        }

        case 'STEP': {
            const config = state.config;
            const newRoads: Record<Direction, RoadInternal> = {} as Record<Direction, RoadInternal>;
            for (const dir of ALL_DIRECTIONS) {
                const road = state.roads[dir];
                newRoads[dir] = {
                    lightState: 'red',
                    lanes: road.lanes.map((l) => ({ type: l.type, vehicles: [...l.vehicles] })),
                };
            }

            let bestPhaseIdx = -1;
            let bestPressure = -1;

            // Starvation check
            let starvedPhaseIdx = -1;
            for (const dir of ALL_DIRECTIONS) {
                const vehicles = getAllVehicles(newRoads[dir]);
                if (vehicles.length === 0) continue;
                const maxWait = Math.max(...vehicles.map((v) => v.waitTime));
                if (maxWait >= config.maxStarvationTime) {
                    for (let i = 0; i < PHASES.length; i++) {
                        if (PHASES[i].maneuvers.some((m) => m.direction === dir)) {
                            const p = calcPhasePressure(PHASES[i], newRoads, config);
                            if (p > bestPressure) { bestPressure = p; starvedPhaseIdx = i; }
                        }
                    }
                    if (starvedPhaseIdx >= 0) break;
                }
            }

            if (starvedPhaseIdx >= 0) {
                bestPhaseIdx = starvedPhaseIdx;
            } else {
                // Emergency override
                if (config.emergencyOverrideMinGreen) {
                    let bestEmIdx = -1, bestEmP = -1;
                    for (let i = 0; i < PHASES.length; i++) {
                        if (phaseHasEmergency(PHASES[i], newRoads)) {
                            const p = calcPhasePressure(PHASES[i], newRoads, config);
                            if (p > bestEmP) { bestEmP = p; bestEmIdx = i; }
                        }
                    }
                    if (bestEmIdx >= 0 && bestEmIdx !== state.currentPhaseIndex) {
                        bestPhaseIdx = bestEmIdx;
                        bestPressure = bestEmP;
                    }
                }

                // MinGreen
                if (bestPhaseIdx < 0 && state.currentPhaseIndex >= 0 &&
                    state.currentPhaseDuration < config.minGreenDuration &&
                    phaseHasVehicles(PHASES[state.currentPhaseIndex], newRoads)) {
                    bestPhaseIdx = state.currentPhaseIndex;
                    bestPressure = calcPhasePressure(PHASES[bestPhaseIdx], newRoads, config);
                }

                // Best by pressure
                if (bestPhaseIdx < 0) {
                    for (let i = 0; i < PHASES.length; i++) {
                        const p = calcPhasePressure(PHASES[i], newRoads, config);
                        if (p > bestPressure) { bestPressure = p; bestPhaseIdx = i; }
                    }
                    if (bestPressure <= 0) bestPhaseIdx = -1;
                }
            }

            const activePhase: Direction[] = [];
            const leftVehicles: string[] = [];
            let newPhaseIdx = state.currentPhaseIndex;
            let newPhaseDur = state.currentPhaseDuration;

            if (bestPhaseIdx >= 0) {
                const phase = PHASES[bestPhaseIdx];
                for (const m of phase.maneuvers) {
                    newRoads[m.direction].lightState = 'green';
                    activePhase.push(m.direction);
                }
                for (const m of phase.maneuvers) {
                    for (const lt of m.lanes) {
                        const laneIdx = newRoads[m.direction].lanes.findIndex((l) => l.type === lt);
                        if (laneIdx >= 0) {
                            const lane = newRoads[m.direction].lanes[laneIdx];
                            if (lane.vehicles.length > 0) {
                                leftVehicles.push(lane.vehicles[0].id);
                                newRoads[m.direction].lanes[laneIdx] = {
                                    ...lane, vehicles: lane.vehicles.slice(1),
                                };
                            }
                        }
                    }
                }
                if (bestPhaseIdx !== state.currentPhaseIndex) {
                    newPhaseIdx = bestPhaseIdx; newPhaseDur = 1;
                } else {
                    newPhaseDur = state.currentPhaseDuration + 1;
                }
            } else {
                newPhaseIdx = -1; newPhaseDur = 0;
            }

            // Increment wait times
            for (const dir of ALL_DIRECTIONS) {
                for (let li = 0; li < newRoads[dir].lanes.length; li++) {
                    newRoads[dir].lanes[li] = {
                        ...newRoads[dir].lanes[li],
                        vehicles: newRoads[dir].lanes[li].vehicles.map((v) => ({
                            ...v, waitTime: v.waitTime + 1,
                        })),
                    };
                }
            }

            return {
                ...state,
                roads: newRoads,
                stepCount: state.stepCount + 1,
                activePhase,
                log: [{ step: state.stepCount + 1, leftVehicles, timestamp: Date.now() }, ...state.log.slice(0, 49)],
                currentPhaseIndex: newPhaseIdx,
                currentPhaseDuration: newPhaseDur,
            };
        }

        case 'RESET':
            return { ...initialState(), laneCount: state.laneCount, roads: createEmptyRoads(state.laneCount), config: state.config };

        default: return state;
    }
}

export function useSimulation() {
    const [state, dispatch] = useReducer(reducer, undefined, initialState);
    const vehicleCounterRef = useRef(1);

    const addVehicle = useCallback(
        (startRoad: Direction, endRoad: Direction, isEmergency: boolean, customId?: string) => {
            const id = customId || `${isEmergency ? 'amb' : 'car'}${vehicleCounterRef.current}`;
            vehicleCounterRef.current++;
            const lane = determineLane(startRoad, endRoad);
            const vehicle: Vehicle = { id, startRoad, endRoad, isEmergency, waitTime: 0, lane };
            dispatch({ type: 'ADD_VEHICLE', vehicle, startRoad });
        },
        [],
    );

    const step = useCallback(() => dispatch({ type: 'STEP' }), []);
    const reset = useCallback(() => { dispatch({ type: 'RESET' }); vehicleCounterRef.current = 1; }, []);
    const setLaneCount = useCallback((count: number) => { dispatch({ type: 'SET_LANES', count }); vehicleCounterRef.current = 1; }, []);

    const totalVehicles = ALL_DIRECTIONS.reduce((sum, dir) => sum + getRoadVehicleCount(state.roads[dir]), 0);

    const simState: SimulationState = {
        step: state.stepCount,
        roads: Object.fromEntries(
            ALL_DIRECTIONS.map((dir) => [dir, {
                direction: dir, lanes: state.roads[dir].lanes, lightState: state.roads[dir].lightState,
            }]),
        ) as Record<Direction, RoadState>,
        activePhase: state.activePhase,
        log: state.log,
        laneCount: state.laneCount,
    };

    return { state: simState, addVehicle, step, reset, totalVehicles, setLaneCount };
}
