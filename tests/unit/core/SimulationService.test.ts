import { describe, it, expect } from 'vitest';
import { SimulationService } from '../../../src/core/services/SimulationService.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('SimulationService', () => {
    it('should process addVehicle commands', () => {
        const service = new SimulationService({ minGreenDuration: 0 });
        const result = service.processCommands([
            { type: 'addVehicle', vehicleId: 'car1', startRoad: 'north', endRoad: 'south' },
        ]);
        expect(result.stepStatuses).toHaveLength(0);
        expect(service.getIntersection().getRoad(Direction.North).length).toBe(1);
    });

    it('should process step commands', () => {
        const service = new SimulationService({ minGreenDuration: 0 });
        const result = service.processCommands([
            { type: 'addVehicle', vehicleId: 'car1', startRoad: 'north', endRoad: 'south' },
            { type: 'step' },
        ]);
        expect(result.stepStatuses[0].leftVehicles).toContain('car1');
    });

    it('should handle emergency vehicles', () => {
        const service = new SimulationService({ minGreenDuration: 0 });
        const result = service.processCommands([
            { type: 'addVehicle', vehicleId: 'car1', startRoad: 'north', endRoad: 'south' },
            { type: 'addVehicle', vehicleId: 'amb1', startRoad: 'east', endRoad: 'west', isEmergency: true },
            { type: 'step' },
        ]);
        expect(result.stepStatuses[0].leftVehicles).toContain('amb1');
    });

    it('should accept SimulationConfig with laneCount=2', () => {
        const service = new SimulationService({ laneCount: 2 });
        expect(service.getIntersection().getRoad(Direction.North).getLanes()).toHaveLength(2);
    });

    it('should accept SimulationConfig with laneCount=1', () => {
        const service = new SimulationService({ laneCount: 1 });
        expect(service.getIntersection().getRoad(Direction.North).getLanes()).toHaveLength(1);
    });

    it('should expose intersection', () => {
        const service = new SimulationService();
        expect(service.getIntersection().stepCounter).toBe(0);
    });
});
