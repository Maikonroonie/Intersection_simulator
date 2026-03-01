import { describe, it, expect } from 'vitest';
import { CollisionDetector } from '../../../src/core/domain/rules/CollisionDetector.js';
import { Direction } from '../../../src/core/domain/value-objects/Direction.js';

describe('CollisionDetector', () => {
    const detector = new CollisionDetector();

    describe('getValidPhases', () => {
        it('should return 4 phases', () => {
            expect(detector.getValidPhases()).toHaveLength(4);
        });

        it('NS_MAIN uses straight_right lanes', () => {
            const phases = detector.getValidPhases();
            expect(phases[0].name).toBe('NS_MAIN');
            expect(phases[0].maneuvers[0].lanes).toEqual(['straight_right']);
        });

        it('NS_LEFT uses left lanes', () => {
            const phases = detector.getValidPhases();
            expect(phases[1].name).toBe('NS_LEFT');
            expect(phases[1].maneuvers[0].lanes).toEqual(['left']);
        });

        it('should have all 4 phase names', () => {
            const names = detector.getValidPhases().map((p) => p.name);
            expect(names).toEqual(['NS_MAIN', 'NS_LEFT', 'EW_MAIN', 'EW_LEFT']);
        });
    });

    describe('canActivateSimultaneously', () => {
        it('should allow N and S simultaneously', () => {
            expect(detector.canActivateSimultaneously([Direction.North, Direction.South])).toBe(true);
        });
        it('should allow E and W simultaneously', () => {
            expect(detector.canActivateSimultaneously([Direction.East, Direction.West])).toBe(true);
        });
        it('should NOT allow N and E simultaneously', () => {
            expect(detector.canActivateSimultaneously([Direction.North, Direction.East])).toBe(false);
        });
        it('should allow single direction', () => {
            expect(detector.canActivateSimultaneously([Direction.North])).toBe(true);
        });
        it('should allow empty array', () => {
            expect(detector.canActivateSimultaneously([])).toBe(true);
        });
    });

    describe('findPhasesForDirection', () => {
        it('should find 2 phases for North', () => {
            const phases = detector.findPhasesForDirection(Direction.North);
            expect(phases).toHaveLength(2);
            expect(phases.map((p) => p.name)).toContain('NS_MAIN');
            expect(phases.map((p) => p.name)).toContain('NS_LEFT');
        });
    });
});
