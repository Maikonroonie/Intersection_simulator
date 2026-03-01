import { describe, it, expect } from 'vitest';
import { PriorityCalculator } from '../../../src/core/services/PriorityCalculator.js';
import { Road } from '../../../src/core/domain/entities/Road.js';
import { Vehicle } from '../../../src/core/domain/entities/Vehicle.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('PriorityCalculator', () => {
    describe('calculateSimplified', () => {
        it('should return 0 for empty road', () => {
            const road = new Road(Direction.North, 2);
            expect(PriorityCalculator.calculateSimplified(road)).toBe(0);
        });

        it('should calculate based on queue length', () => {
            const road = new Road(Direction.North, 2);
            road.enqueue(new Vehicle('car1', Direction.North, Direction.South));
            road.enqueue(new Vehicle('car2', Direction.North, Direction.West)); // right → straight_right
            expect(PriorityCalculator.calculateSimplified(road)).toBe(2);
        });

        it('should include wait time', () => {
            const road = new Road(Direction.East, 2);
            const v = new Vehicle('car1', Direction.East, Direction.West);
            v.incrementWaitTime();
            v.incrementWaitTime();
            road.enqueue(v);
            expect(PriorityCalculator.calculateSimplified(road)).toBe(2);
        });

        it('should count emergency vehicles (not boolean)', () => {
            const road = new Road(Direction.South, 2);
            road.enqueue(new Vehicle('amb1', Direction.South, Direction.North, true));
            road.enqueue(new Vehicle('amb2', Direction.South, Direction.North, true));
            expect(PriorityCalculator.calculateSimplified(road)).toBe(202);
        });
    });

    describe('calculateFull', () => {
        it('should return 0 for empty road', () => {
            const road = new Road(Direction.North, 2);
            expect(PriorityCalculator.calculateFull(road)).toBe(0);
        });

        it('should apply alpha and beta formula', () => {
            const road = new Road(Direction.North, 2);
            const v = new Vehicle('car1', Direction.North, Direction.South);
            v.incrementWaitTime();
            road.enqueue(v);
            expect(PriorityCalculator.calculateFull(road)).toBeCloseTo(1.3);
        });

        it('should boost emergency vehicles', () => {
            const road = new Road(Direction.South, 2);
            road.enqueue(new Vehicle('amb1', Direction.South, Direction.North, true));
            expect(PriorityCalculator.calculateFull(road)).toBe(6);
        });
    });
});
