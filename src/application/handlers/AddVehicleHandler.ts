import { Intersection } from '../../core/domain/entities/Intersection.js';
import { parseDirection } from '../../core/domain/value-objects/Direction.js';

export class AddVehicleHandler {
    static handle(
        intersection: Intersection,
        vehicleId: string,
        startRoad: string,
        endRoad: string,
        isEmergency: boolean = false,
    ): void {
        intersection.addVehicle(
            vehicleId,
            parseDirection(startRoad),
            parseDirection(endRoad),
            isEmergency,
        );
    }
}
