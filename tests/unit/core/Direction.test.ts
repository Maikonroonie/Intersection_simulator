import { describe, it, expect } from 'vitest';
import { Direction, parseDirection, ALL_DIRECTIONS } from '../../../src/core/domain/value-objects/Direction.js';

describe('Direction', () => {
    it('should have four directions', () => {
        expect(ALL_DIRECTIONS).toHaveLength(4);
        expect(ALL_DIRECTIONS).toContain(Direction.North);
        expect(ALL_DIRECTIONS).toContain(Direction.South);
        expect(ALL_DIRECTIONS).toContain(Direction.East);
        expect(ALL_DIRECTIONS).toContain(Direction.West);
    });

    it('should parse valid direction strings', () => {
        expect(parseDirection('north')).toBe(Direction.North);
        expect(parseDirection('south')).toBe(Direction.South);
        expect(parseDirection('east')).toBe(Direction.East);
        expect(parseDirection('west')).toBe(Direction.West);
    });

    it('should parse case-insensitively', () => {
        expect(parseDirection('NORTH')).toBe(Direction.North);
        expect(parseDirection('South')).toBe(Direction.South);
    });

    it('should throw on invalid direction', () => {
        expect(() => parseDirection('northwest')).toThrow('Invalid direction');
        expect(() => parseDirection('')).toThrow('Invalid direction');
    });
});
