import { describe, it, expect } from 'vitest';
import { TrafficLightController } from '../../../src/core/domain/rules/TrafficLightController.js';
import { Road } from '../../../src/core/domain/entities/Road.js';
import { Vehicle } from '../../../src/core/domain/entities/Vehicle.js';
import { Direction, ALL_DIRECTIONS } from '../../../src/core/domain/value-objects/Direction.js';

function createRoadsMap(laneCount: 1 | 2 = 2): Map<Direction, Road> {
    const roads = new Map<Direction, Road>();
    for (const dir of ALL_DIRECTIONS) {
        roads.set(dir, new Road(dir, laneCount));
    }
    return roads;
}

describe('TrafficLightController', () => {
    describe('calculateLanePressure', () => {
        it('should return 0 for empty lanes', () => {
            const controller = new TrafficLightController();
            const road = new Road(Direction.North, 2);
            expect(controller.calculateLanePressure(road, ['straight_right'])).toBe(0);
        });

        it('should calculate pressure for straight_right lane', () => {
            const controller = new TrafficLightController();
            const road = new Road(Direction.North, 2);
            road.enqueue(new Vehicle('car1', Direction.North, Direction.South)); // straight → straight_right
            road.enqueue(new Vehicle('car2', Direction.North, Direction.West)); // right → straight_right

            expect(controller.calculateLanePressure(road, ['straight_right'])).toBe(2);
            expect(controller.calculateLanePressure(road, ['left'])).toBe(0);
        });

        it('should count multiple emergency vehicles', () => {
            const controller = new TrafficLightController({ emergencyWeight: 100 });
            const road = new Road(Direction.North, 2);
            road.enqueue(new Vehicle('amb1', Direction.North, Direction.South, true));
            road.enqueue(new Vehicle('amb2', Direction.North, Direction.South, true));
            // 2 + 0 + 100*2 = 202
            expect(controller.calculateLanePressure(road, ['straight_right'])).toBe(202);
        });
    });

    describe('calculateNextPhase — 4 phases', () => {
        it('should select NS_MAIN when N has straight vehicles', () => {
            const controller = new TrafficLightController({ minGreenDuration: 0 });
            const roads = createRoadsMap();
            roads.get(Direction.North)!.enqueue(new Vehicle('car1', Direction.North, Direction.South));

            const result = controller.calculateNextPhase(roads);
            expect(result.phase.name).toBe('NS_MAIN');
        });

        it('should select NS_LEFT when N has only left-turn vehicles', () => {
            const controller = new TrafficLightController({ minGreenDuration: 0 });
            const roads = createRoadsMap();
            roads.get(Direction.North)!.enqueue(new Vehicle('car1', Direction.North, Direction.East)); // left

            const result = controller.calculateNextPhase(roads);
            expect(result.phase.name).toBe('NS_LEFT');
        });

        it('should return empty phase when no vehicles', () => {
            const controller = new TrafficLightController({ minGreenDuration: 0 });
            const roads = createRoadsMap();
            const result = controller.calculateNextPhase(roads);
            expect(result.phase.name).toBe('NONE');
        });

        it('should prioritize phase with emergency vehicle', () => {
            const controller = new TrafficLightController({ minGreenDuration: 0 });
            const roads = createRoadsMap();
            roads.get(Direction.North)!.enqueue(new Vehicle('car1', Direction.North, Direction.South));
            roads.get(Direction.North)!.enqueue(new Vehicle('car2', Direction.North, Direction.South));
            roads.get(Direction.North)!.enqueue(new Vehicle('car3', Direction.North, Direction.South));
            roads.get(Direction.East)!.enqueue(new Vehicle('amb1', Direction.East, Direction.West, true));

            const result = controller.calculateNextPhase(roads);
            expect(result.phase.name).toBe('EW_MAIN');
        });
    });

    describe('minGreenDuration', () => {
        it('should keep current phase if minGreen not reached', () => {
            const controller = new TrafficLightController({ minGreenDuration: 3 });
            const roads = createRoadsMap();
            roads.get(Direction.North)!.enqueue(new Vehicle('c1', Direction.North, Direction.South));
            roads.get(Direction.North)!.enqueue(new Vehicle('c2', Direction.North, Direction.South));
            roads.get(Direction.North)!.enqueue(new Vehicle('c3', Direction.North, Direction.South));
            roads.get(Direction.East)!.enqueue(new Vehicle('c4', Direction.East, Direction.West));
            roads.get(Direction.East)!.enqueue(new Vehicle('c5', Direction.East, Direction.West));
            roads.get(Direction.East)!.enqueue(new Vehicle('c6', Direction.East, Direction.West));
            roads.get(Direction.East)!.enqueue(new Vehicle('c7', Direction.East, Direction.West));
            roads.get(Direction.East)!.enqueue(new Vehicle('c8', Direction.East, Direction.West));

            const r1 = controller.calculateNextPhase(roads);
            roads.get(Direction.North)!.getLane('straight_right').dequeue();
            const r2 = controller.calculateNextPhase(roads);
            expect(r2.phase.name).toBe(r1.phase.name);
        });
    });

    describe('emergency override minGreen', () => {
        it('should override minGreen when emergency arrives', () => {
            const controller = new TrafficLightController({
                minGreenDuration: 5,
                emergencyOverrideMinGreen: true,
            });
            const roads = createRoadsMap();
            roads.get(Direction.North)!.enqueue(new Vehicle('c1', Direction.North, Direction.South));
            roads.get(Direction.North)!.enqueue(new Vehicle('c2', Direction.North, Direction.South));
            controller.calculateNextPhase(roads);
            roads.get(Direction.East)!.enqueue(new Vehicle('amb1', Direction.East, Direction.West, true));
            const result = controller.calculateNextPhase(roads);
            expect(result.phase.name).toBe('EW_MAIN');
        });
    });

    describe('starvation prevention', () => {
        it('should force phase for starved road', () => {
            const controller = new TrafficLightController({ maxStarvationTime: 3, minGreenDuration: 0 });
            const roads = createRoadsMap();
            const starved = new Vehicle('car1', Direction.West, Direction.East);
            for (let i = 0; i < 4; i++) starved.incrementWaitTime();
            roads.get(Direction.West)!.enqueue(starved);
            roads.get(Direction.North)!.enqueue(new Vehicle('c2', Direction.North, Direction.South));
            roads.get(Direction.North)!.enqueue(new Vehicle('c3', Direction.North, Direction.South));

            const result = controller.calculateNextPhase(roads);
            expect(result.phase.name).toContain('EW');
        });
    });
});
