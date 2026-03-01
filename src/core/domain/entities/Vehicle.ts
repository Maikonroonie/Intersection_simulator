import { Direction } from '../value-objects/Direction.js';
import { VehicleId } from '../value-objects/VehicleId.js';
import { TurnType, determineTurnType } from '../value-objects/TurnType.js';

export class Vehicle {
    public readonly id: VehicleId;
    public readonly startRoad: Direction;
    public readonly endRoad: Direction;
    public readonly isEmergency: boolean;
    public readonly turnType: TurnType;
    private _waitTime: number;

    constructor(
        id: VehicleId,
        startRoad: Direction,
        endRoad: Direction,
        isEmergency: boolean = false,
    ) {
        if (startRoad === endRoad) {
            throw new Error(`Vehicle ${id}: startRoad and endRoad cannot be the same (${startRoad})`);
        }
        this.id = id;
        this.startRoad = startRoad;
        this.endRoad = endRoad;
        this.isEmergency = isEmergency;
        this.turnType = determineTurnType(startRoad, endRoad);
        this._waitTime = 0;
    }

    get waitTime(): number {
        return this._waitTime;
    }

    incrementWaitTime(): void {
        this._waitTime++;
    }
}
