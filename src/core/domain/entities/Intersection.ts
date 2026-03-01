import { Direction, ALL_DIRECTIONS } from '../value-objects/Direction.js';
import { VehicleId } from '../value-objects/VehicleId.js';
import { SimulationConfig, resolveConfig } from '../value-objects/SimulationConfig.js';
import { Vehicle } from './Vehicle.js';
import { Road } from './Road.js';
import { TrafficLightController } from '../rules/TrafficLightController.js';

export class Intersection {
    private readonly roads: Map<Direction, Road>;
    private readonly controller: TrafficLightController;
    private readonly config: SimulationConfig;
    private _stepCounter: number;

    constructor(config?: Partial<SimulationConfig>) {
        this.config = resolveConfig(config);
        this.roads = new Map<Direction, Road>();
        for (const dir of ALL_DIRECTIONS) {
            this.roads.set(dir, new Road(dir, this.config.laneCount));
        }
        this.controller = new TrafficLightController(this.config);
        this._stepCounter = 0;
    }

    get stepCounter(): number {
        return this._stepCounter;
    }

    getRoad(direction: Direction): Road {
        const road = this.roads.get(direction);
        if (!road) throw new Error(`Road not found for direction: ${direction}`);
        return road;
    }

    getRoads(): Map<Direction, Road> {
        return this.roads;
    }

    addVehicle(
        vehicleId: VehicleId,
        startRoad: Direction,
        endRoad: Direction,
        isEmergency: boolean = false,
    ): void {
        const vehicle = new Vehicle(vehicleId, startRoad, endRoad, isEmergency);
        this.getRoad(startRoad).enqueue(vehicle);
    }

    /**
     * Execute one simulation step:
     * 1. Calculate optimal phase (4-phase system)
     * 2. Set traffic lights
     * 3. Dequeue one vehicle per active lane
     * 4. Increment wait times
     */
    step(): string[] {
        this._stepCounter++;

        const phaseResult = this.controller.calculateNextPhase(this.roads);

        // Set all lights to red, then green for active directions
        for (const road of this.roads.values()) {
            road.trafficLight.setRed();
        }
        for (const maneuver of phaseResult.phase.maneuvers) {
            const road = this.roads.get(maneuver.direction);
            if (road) road.trafficLight.setGreen();
        }

        // Dequeue one vehicle per active lane
        const leftVehicles: string[] = [];
        for (const maneuver of phaseResult.phase.maneuvers) {
            const road = this.roads.get(maneuver.direction);
            if (!road) continue;
            for (const laneType of maneuver.lanes) {
                const lane = road.getLane(laneType);
                if (!lane.isEmpty) {
                    const vehicle = lane.dequeue();
                    if (vehicle) leftVehicles.push(vehicle.id);
                }
            }
        }

        // Increment wait times for remaining vehicles
        for (const road of this.roads.values()) {
            road.incrementAllWaitTimes();
        }

        return leftVehicles;
    }
}
