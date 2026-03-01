import { Direction } from '../value-objects/Direction.js';
import { LaneType, turnTypeToLane } from '../value-objects/TurnType.js';
import { Vehicle } from './Vehicle.js';
import { Lane } from './Lane.js';
import { TrafficLight } from './TrafficLight.js';

export class Road {
    public readonly direction: Direction;
    public readonly trafficLight: TrafficLight;
    private readonly _lanes: Lane[];

    constructor(direction: Direction, laneCount: 1 | 2 = 2) {
        this.direction = direction;
        this.trafficLight = new TrafficLight('red');
        this._lanes =
            laneCount === 1
                ? [new Lane('straight_right')]
                : [new Lane('left'), new Lane('straight_right')];
    }

    // ===== Lane accessors =====

    getLane(type: LaneType): Lane {
        const lane = this._lanes.find((l) => l.type === type);
        if (!lane) {
            // Fallback: if single-lane mode, use the only lane
            return this._lanes[0];
        }
        return lane;
    }

    getLanes(): ReadonlyArray<Lane> {
        return this._lanes;
    }

    // ===== Aggregate accessors (backward compatible) =====

    get length(): number {
        return this._lanes.reduce((sum, l) => sum + l.length, 0);
    }

    get isEmpty(): boolean {
        return this._lanes.every((l) => l.isEmpty);
    }

    getVehicles(): ReadonlyArray<Vehicle> {
        return this._lanes.flatMap((l) => [...l.getVehicles()]);
    }

    /**
     * Enqueue a vehicle into the correct lane based on its turnType.
     * left turn → left lane, straight/right → straight_right lane.
     */
    enqueue(vehicle: Vehicle): void {
        const laneType = turnTypeToLane(vehicle.turnType);
        this.getLane(laneType).enqueue(vehicle);
    }

    /**
     * Dequeue the first vehicle from the first non-empty lane.
     * Prefers straight_right > left for backward compatibility.
     */
    dequeue(): Vehicle | undefined {
        for (const type of ['straight_right', 'left'] as LaneType[]) {
            const lane = this._lanes.find((l) => l.type === type);
            if (lane && !lane.isEmpty) {
                return lane.dequeue();
            }
        }
        return undefined;
    }

    peek(): Vehicle | undefined {
        for (const type of ['straight_right', 'left'] as LaneType[]) {
            const lane = this._lanes.find((l) => l.type === type);
            if (lane && !lane.isEmpty) {
                return lane.peek();
            }
        }
        return undefined;
    }

    hasEmergencyVehicle(): boolean {
        return this._lanes.some((l) => l.hasEmergencyVehicle());
    }

    getEmergencyCount(): number {
        return this._lanes.reduce((sum, l) => sum + l.getEmergencyCount(), 0);
    }

    getTotalWaitTime(): number {
        return this._lanes.reduce((sum, l) => sum + l.getTotalWaitTime(), 0);
    }

    incrementAllWaitTimes(): void {
        for (const lane of this._lanes) {
            lane.incrementAllWaitTimes();
        }
    }
}
