import { describe, it, expect } from 'vitest';
import { determineTurnType, turnTypeToLane } from '../../../src/core/domain/value-objects/TurnType.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('TurnType', () => {
    describe('determineTurnType — right-hand traffic (driver perspective)', () => {
        // From North (heading south): left=East, straight=South, right=West
        it('North → East = left', () => {
            expect(determineTurnType(Direction.North, Direction.East)).toBe('left');
        });
        it('North → South = straight', () => {
            expect(determineTurnType(Direction.North, Direction.South)).toBe('straight');
        });
        it('North → West = right', () => {
            expect(determineTurnType(Direction.North, Direction.West)).toBe('right');
        });

        // From South (heading north): left=West, straight=North, right=East
        it('South → West = left', () => {
            expect(determineTurnType(Direction.South, Direction.West)).toBe('left');
        });
        it('South → North = straight', () => {
            expect(determineTurnType(Direction.South, Direction.North)).toBe('straight');
        });
        it('South → East = right', () => {
            expect(determineTurnType(Direction.South, Direction.East)).toBe('right');
        });

        // From East (heading west): left=South, straight=West, right=North
        it('East → South = left', () => {
            expect(determineTurnType(Direction.East, Direction.South)).toBe('left');
        });
        it('East → West = straight', () => {
            expect(determineTurnType(Direction.East, Direction.West)).toBe('straight');
        });
        it('East → North = right', () => {
            expect(determineTurnType(Direction.East, Direction.North)).toBe('right');
        });

        // From West (heading east): left=North, straight=East, right=South
        it('West → North = left', () => {
            expect(determineTurnType(Direction.West, Direction.North)).toBe('left');
        });
        it('West → East = straight', () => {
            expect(determineTurnType(Direction.West, Direction.East)).toBe('straight');
        });
        it('West → South = right', () => {
            expect(determineTurnType(Direction.West, Direction.South)).toBe('right');
        });

        it('should throw for same direction', () => {
            expect(() => determineTurnType(Direction.North, Direction.North)).toThrow();
        });
    });

    describe('turnTypeToLane', () => {
        it('left → left', () => {
            expect(turnTypeToLane('left')).toBe('left');
        });
        it('straight → straight_right', () => {
            expect(turnTypeToLane('straight')).toBe('straight_right');
        });
        it('right → straight_right', () => {
            expect(turnTypeToLane('right')).toBe('straight_right');
        });
    });
});
