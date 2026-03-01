import { describe, it, expect } from 'vitest';
import { Road } from '../../../src/core/domain/entities/Road.js';
import { Vehicle } from '../../../src/core/domain/entities/Vehicle.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('Road', () => {
    it('should start empty with red light (2 lanes)', () => {
        const road = new Road(Direction.North, 2);
        expect(road.direction).toBe(Direction.North);
        expect(road.isEmpty).toBe(true);
        expect(road.length).toBe(0);
        expect(road.trafficLight.isRed).toBe(true);
        expect(road.getLanes()).toHaveLength(2);
    });

    it('should have left and straight_right lanes', () => {
        const road = new Road(Direction.North, 2);
        const lanes = road.getLanes();
        expect(lanes[0].type).toBe('left');
        expect(lanes[1].type).toBe('straight_right');
    });

    it('should start with 1 lane in single-lane mode', () => {
        const road = new Road(Direction.North, 1);
        expect(road.getLanes()).toHaveLength(1);
        expect(road.getLanes()[0].type).toBe('straight_right');
    });

    it('should route straight vehicles to straight_right lane', () => {
        const road = new Road(Direction.North, 2);
        road.enqueue(new Vehicle('car1', Direction.North, Direction.South)); // straight
        expect(road.getLane('straight_right').length).toBe(1);
        expect(road.getLane('left').length).toBe(0);
    });

    it('should route right-turn vehicles to straight_right lane', () => {
        const road = new Road(Direction.North, 2);
        road.enqueue(new Vehicle('car1', Direction.North, Direction.West)); // right turn
        expect(road.getLane('straight_right').length).toBe(1);
        expect(road.getLane('left').length).toBe(0);
    });

    it('should route left-turn vehicles to left lane', () => {
        const road = new Road(Direction.North, 2);
        road.enqueue(new Vehicle('car1', Direction.North, Direction.East)); // left turn
        expect(road.getLane('left').length).toBe(1);
        expect(road.getLane('straight_right').length).toBe(0);
    });

    it('should aggregate length across lanes', () => {
        const road = new Road(Direction.North, 2);
        road.enqueue(new Vehicle('car1', Direction.North, Direction.South)); // straight_right
        road.enqueue(new Vehicle('car2', Direction.North, Direction.East)); // left
        road.enqueue(new Vehicle('car3', Direction.North, Direction.West)); // right → straight_right
        expect(road.length).toBe(3);
        expect(road.getLane('straight_right').length).toBe(2);
        expect(road.getLane('left').length).toBe(1);
    });

    it('should detect emergency vehicles across all lanes', () => {
        const road = new Road(Direction.South, 2);
        road.enqueue(new Vehicle('car1', Direction.South, Direction.North));
        expect(road.hasEmergencyVehicle()).toBe(false);
        road.enqueue(new Vehicle('amb1', Direction.South, Direction.West, true)); // left lane
        expect(road.hasEmergencyVehicle()).toBe(true);
        expect(road.getEmergencyCount()).toBe(1);
    });

    it('should count multiple emergency vehicles across lanes', () => {
        const road = new Road(Direction.North, 2);
        road.enqueue(new Vehicle('amb1', Direction.North, Direction.South, true)); // straight_right
        road.enqueue(new Vehicle('amb2', Direction.North, Direction.East, true)); // left
        expect(road.getEmergencyCount()).toBe(2);
    });

    it('should calculate total wait time across all lanes', () => {
        const road = new Road(Direction.East, 2);
        const v1 = new Vehicle('car1', Direction.East, Direction.West); // straight_right
        const v2 = new Vehicle('car2', Direction.East, Direction.South); // left
        v1.incrementWaitTime();
        v1.incrementWaitTime();
        v2.incrementWaitTime();
        road.enqueue(v1);
        road.enqueue(v2);
        expect(road.getTotalWaitTime()).toBe(3);
    });

    it('should increment all wait times across lanes', () => {
        const road = new Road(Direction.West, 2);
        const v1 = new Vehicle('car1', Direction.West, Direction.East); // straight_right
        const v2 = new Vehicle('car2', Direction.West, Direction.North); // left
        road.enqueue(v1);
        road.enqueue(v2);
        road.incrementAllWaitTimes();
        expect(v1.waitTime).toBe(1);
        expect(v2.waitTime).toBe(1);
    });

    it('should return undefined when dequeueing from empty road', () => {
        const road = new Road(Direction.North, 2);
        expect(road.dequeue()).toBeUndefined();
    });

    it('should route all vehicles to single lane in 1-lane mode', () => {
        const road = new Road(Direction.North, 1);
        road.enqueue(new Vehicle('car1', Direction.North, Direction.East)); // left
        road.enqueue(new Vehicle('car2', Direction.North, Direction.West)); // right
        expect(road.getLane('straight_right').length).toBe(2);
        expect(road.length).toBe(2);
    });
});
