import { Intersection } from '../domain/entities/Intersection.js';
import { parseDirection } from '../domain/value-objects/Direction.js';
import { SimulationConfig } from '../domain/value-objects/SimulationConfig.js';

export interface AddVehicleCommand {
    type: 'addVehicle';
    vehicleId: string;
    startRoad: string;
    endRoad: string;
    isEmergency?: boolean;
}

export interface StepCommand {
    type: 'step';
}

export type Command = AddVehicleCommand | StepCommand;

export interface StepStatus {
    leftVehicles: string[];
}

export interface SimulationResult {
    stepStatuses: StepStatus[];
}

export class SimulationService {
    private readonly intersection: Intersection;

    constructor(config?: Partial<SimulationConfig>) {
        this.intersection = new Intersection(config);
    }

    /**
     * Process a list of commands and return simulation results.
     * Only `step` commands produce entries in stepStatuses.
     */
    processCommands(commands: Command[]): SimulationResult {
        const stepStatuses: StepStatus[] = [];

        for (const command of commands) {
            switch (command.type) {
                case 'addVehicle': {
                    const startRoad = parseDirection(command.startRoad);
                    const endRoad = parseDirection(command.endRoad);
                    this.intersection.addVehicle(
                        command.vehicleId,
                        startRoad,
                        endRoad,
                        command.isEmergency ?? false,
                    );
                    break;
                }
                case 'step': {
                    const leftVehicles = this.intersection.step();
                    stepStatuses.push({ leftVehicles });
                    break;
                }
            }
        }

        return { stepStatuses };
    }

    getIntersection(): Intersection {
        return this.intersection;
    }
}
