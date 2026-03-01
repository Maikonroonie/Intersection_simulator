import { describe, it, expect } from 'vitest';
import { TrafficLight } from '../../../src/core/domain/entities/TrafficLight.js';

describe('TrafficLight', () => {
    it('should start red by default', () => {
        const light = new TrafficLight();
        expect(light.state).toBe('red');
        expect(light.isRed).toBe(true);
        expect(light.isGreen).toBe(false);
    });

    it('should start with custom initial state', () => {
        const light = new TrafficLight('green');
        expect(light.state).toBe('green');
        expect(light.isGreen).toBe(true);
    });

    it('should change to green', () => {
        const light = new TrafficLight();
        light.setGreen();
        expect(light.isGreen).toBe(true);
        expect(light.isRed).toBe(false);
    });

    it('should change to red', () => {
        const light = new TrafficLight('green');
        light.setRed();
        expect(light.isRed).toBe(true);
        expect(light.isGreen).toBe(false);
    });

    it('should change via setState', () => {
        const light = new TrafficLight();
        light.setState('green');
        expect(light.isGreen).toBe(true);
        light.setState('red');
        expect(light.isRed).toBe(true);
    });
});
