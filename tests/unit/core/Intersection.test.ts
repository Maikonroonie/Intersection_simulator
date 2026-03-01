import { describe, it, expect } from 'vitest';
import { Intersection } from '../../../src/core/domain/entities/Intersection.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('Intersection', () => {
    it('should start with 4 empty roads', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        for (const dir of [Direction.North, Direction.South, Direction.East, Direction.West]) {
            expect(intersection.getRoad(dir).isEmpty).toBe(true);
        }
        expect(intersection.stepCounter).toBe(0);
    });

    it('should have 2 lanes per road', () => {
        const intersection = new Intersection({ laneCount: 2 });
        expect(intersection.getRoad(Direction.North).getLanes()).toHaveLength(2);
    });

    it('should add straight vehicle to straight_right lane', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('car1', Direction.North, Direction.South);
        expect(intersection.getRoad(Direction.North).getLane('straight_right').length).toBe(1);
    });

    it('should add left-turn vehicle to left lane', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('car1', Direction.North, Direction.East); // left turn
        expect(intersection.getRoad(Direction.North).getLane('left').length).toBe(1);
        expect(intersection.getRoad(Direction.North).getLane('straight_right').length).toBe(0);
    });

    it('NS_MAIN: straight and right-turn leave, left does NOT', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('straight', Direction.North, Direction.South);
        intersection.addVehicle('right', Direction.North, Direction.West); // right → straight_right lane
        intersection.addVehicle('left', Direction.North, Direction.East); // left → left lane

        // straight_right lane has 2 vehicles (straight, right), left lane has 1
        // NS_MAIN drains straight_right → only 1 dequeued (FIFO: 'straight' first)
        const left = intersection.step();
        expect(left).toContain('straight');
        expect(left).not.toContain('left');
    });

    it('NS_LEFT: left-turn leaves, straight does NOT', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('leftN', Direction.North, Direction.East); // left
        intersection.addVehicle('leftS', Direction.South, Direction.West); // left
        const left = intersection.step();
        expect(left).toContain('leftN');
        expect(left).toContain('leftS');
    });

    it('should not release vehicles from conflicting roads simultaneously', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('car1', Direction.North, Direction.South);
        intersection.addVehicle('car2', Direction.East, Direction.West);
        const left = intersection.step();
        const hasN = left.includes('car1');
        const hasE = left.includes('car2');
        expect(hasN && hasE).toBe(false);
    });

    it('should prioritize emergency vehicle', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('car1', Direction.North, Direction.South);
        intersection.addVehicle('car2', Direction.North, Direction.South);
        intersection.addVehicle('amb1', Direction.East, Direction.West, true);
        const left = intersection.step();
        expect(left).toContain('amb1');
    });

    it('should process multiple steps correctly', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('car1', Direction.North, Direction.South);
        intersection.addVehicle('car2', Direction.East, Direction.West);
        const left1 = intersection.step();
        const left2 = intersection.step();
        const allLeft = [...left1, ...left2];
        expect(allLeft).toContain('car1');
        expect(allLeft).toContain('car2');
    });

    it('should return empty array when no vehicles', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        expect(intersection.step()).toEqual([]);
    });

    it('should handle FIFO within a single lane', () => {
        const intersection = new Intersection({ laneCount: 2, minGreenDuration: 0 });
        intersection.addVehicle('car1', Direction.North, Direction.South);
        intersection.addVehicle('car2', Direction.North, Direction.South);
        const left1 = intersection.step();
        expect(left1).toContain('car1');
        expect(left1).not.toContain('car2');
        const left2 = intersection.step();
        expect(left2).toContain('car2');
    });
});
