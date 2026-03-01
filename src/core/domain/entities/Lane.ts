import { LaneType } from '../value-objects/TurnType.js';
import { Vehicle } from './Vehicle.js';

/**
 * A single lane within a road. Each lane has its own FIFO vehicle queue.
 * Lane types: 'left' (left turn) or 'straight_right' (straight + right turns).
 */
export class Lane {
    public readonly type: LaneType;
    private _vehicleQueue: Vehicle[];

    constructor(type: LaneType) {
        this.type = type;
        this._vehicleQueue = [];
    }

    get length(): number {
        return this._vehicleQueue.length;
    }

    get isEmpty(): boolean {
        return this._vehicleQueue.length === 0;
    }

    getVehicles(): ReadonlyArray<Vehicle> {
        return this._vehicleQueue;
    }

    enqueue(vehicle: Vehicle): void {
        this._vehicleQueue.push(vehicle);
    }

    dequeue(): Vehicle | undefined {
        return this._vehicleQueue.shift();
    }

    peek(): Vehicle | undefined {
        return this._vehicleQueue[0];
    }

    getEmergencyCount(): number {
        return this._vehicleQueue.filter((v) => v.isEmergency).length;
    }

    hasEmergencyVehicle(): boolean {
        return this._vehicleQueue.some((v) => v.isEmergency);
    }

    getTotalWaitTime(): number {
        return this._vehicleQueue.reduce((sum, v) => sum + v.waitTime, 0);
    }

    incrementAllWaitTimes(): void {
        for (const vehicle of this._vehicleQueue) {
            vehicle.incrementWaitTime();
        }
    }
}
