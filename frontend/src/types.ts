export type Direction = 'north' | 'south' | 'east' | 'west';
export type LaneType = 'left' | 'straight_right';

export interface Vehicle {
    id: string;
    startRoad: Direction;
    endRoad: Direction;
    isEmergency: boolean;
    waitTime: number;
    lane: LaneType;
}

export interface LaneState {
    type: LaneType;
    vehicles: Vehicle[];
}

export interface RoadState {
    direction: Direction;
    lanes: LaneState[];
    lightState: 'green' | 'red';
}

export interface SimulationState {
    step: number;
    roads: Record<Direction, RoadState>;
    activePhase: Direction[];
    log: LogEntry[];
    laneCount: number;
}

export interface LogEntry {
    step: number;
    leftVehicles: string[];
    timestamp: number;
}

export function determineLane(startRoad: Direction, endRoad: Direction): LaneType {
    const leftTurnMap: Record<Direction, Direction> = {
        north: 'east',
        south: 'west',
        east: 'south',
        west: 'north',
    };
    return leftTurnMap[startRoad] === endRoad ? 'left' : 'straight_right';
}
