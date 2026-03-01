import { describe, it, expect } from 'vitest';
import { Vehicle } from '../../../src/core/domain/entities/Vehicle.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('Vehicle', () => {
    it('should create a vehicle with correct properties', () => {
        const vehicle = new Vehicle('car1', Direction.North, Direction.South);
        expect(vehicle.id).toBe('car1');
        expect(vehicle.startRoad).toBe(Direction.North);
        expect(vehicle.endRoad).toBe(Direction.South);
        expect(vehicle.isEmergency).toBe(false);
        expect(vehicle.waitTime).toBe(0);
        expect(vehicle.turnType).toBe('straight');
    });

    it('should compute turnType correctly (left turn)', () => {
        const vehicle = new Vehicle('car1', Direction.North, Direction.East);
        expect(vehicle.turnType).toBe('left');
    });

    it('should compute turnType correctly (right turn)', () => {
        const vehicle = new Vehicle('car1', Direction.North, Direction.West);
        expect(vehicle.turnType).toBe('right');
    });

    it('should create an emergency vehicle', () => {
        const vehicle = new Vehicle('ambulance1', Direction.South, Direction.North, true);
        expect(vehicle.isEmergency).toBe(true);
    });

    it('should increment wait time', () => {
        const vehicle = new Vehicle('car1', Direction.North, Direction.South);
        expect(vehicle.waitTime).toBe(0);
        vehicle.incrementWaitTime();
        expect(vehicle.waitTime).toBe(1);
        vehicle.incrementWaitTime();
        expect(vehicle.waitTime).toBe(2);
    });

    it('should throw if startRoad equals endRoad', () => {
        expect(() => new Vehicle('car1', Direction.North, Direction.North)).toThrow(
            'startRoad and endRoad cannot be the same',
        );
    });
});
