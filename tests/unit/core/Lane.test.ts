import { describe, it, expect } from 'vitest';
import { Lane } from '../../../src/core/domain/entities/Lane.js';
import { Vehicle } from '../../../src/core/domain/entities/Vehicle.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('Lane', () => {
    it('should start empty', () => {
        const lane = new Lane('straight_right');
        expect(lane.type).toBe('straight_right');
        expect(lane.isEmpty).toBe(true);
        expect(lane.length).toBe(0);
    });

    it('should enqueue and dequeue in FIFO order', () => {
        const lane = new Lane('straight_right');
        const v1 = new Vehicle('car1', Direction.North, Direction.South);
        const v2 = new Vehicle('car2', Direction.North, Direction.South);

        lane.enqueue(v1);
        lane.enqueue(v2);
        expect(lane.length).toBe(2);
        expect(lane.peek()).toBe(v1);

        expect(lane.dequeue()).toBe(v1);
        expect(lane.length).toBe(1);
        expect(lane.peek()).toBe(v2);
    });

    it('should return undefined when dequeueing from empty lane', () => {
        const lane = new Lane('left');
        expect(lane.dequeue()).toBeUndefined();
        expect(lane.peek()).toBeUndefined();
    });

    it('should count emergency vehicles', () => {
        const lane = new Lane('straight_right');
        const normal = new Vehicle('car1', Direction.North, Direction.South);
        const amb1 = new Vehicle('amb1', Direction.North, Direction.South, true);
        const amb2 = new Vehicle('amb2', Direction.North, Direction.South, true);

        lane.enqueue(normal);
        expect(lane.getEmergencyCount()).toBe(0);

        lane.enqueue(amb1);
        expect(lane.getEmergencyCount()).toBe(1);

        lane.enqueue(amb2);
        expect(lane.getEmergencyCount()).toBe(2);
    });

    it('should calculate total wait time', () => {
        const lane = new Lane('straight_right');
        const v1 = new Vehicle('car1', Direction.North, Direction.South);
        const v2 = new Vehicle('car2', Direction.North, Direction.West); // right turn, same lane

        v1.incrementWaitTime();
        v1.incrementWaitTime();
        v2.incrementWaitTime();

        lane.enqueue(v1);
        lane.enqueue(v2);
        expect(lane.getTotalWaitTime()).toBe(3);
    });

    it('should increment all wait times', () => {
        const lane = new Lane('left');
        const v1 = new Vehicle('car1', Direction.North, Direction.East); // left turn
        const v2 = new Vehicle('car2', Direction.South, Direction.West); // left turn

        lane.enqueue(v1);
        lane.enqueue(v2);

        lane.incrementAllWaitTimes();
        expect(v1.waitTime).toBe(1);
        expect(v2.waitTime).toBe(1);
    });
});
