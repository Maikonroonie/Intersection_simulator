import { SimulationService, type Command } from '../../core/services/SimulationService.js';
import { Intersection } from '../../core/domain/entities/Intersection.js';

export class AddVehicleHandler {
    static handle(
        intersection: Intersection,
        vehicleId: string,
        startRoad: string,
        endRoad: string,
        isEmergency: boolean = false,
    ): void {
        const { parseDirection } = require('../../core/domain/value-objects/Direction.js');
        intersection.addVehicle(
            vehicleId,
            parseDirection(startRoad),
            parseDirection(endRoad),
            isEmergency,
        );
    }
}
