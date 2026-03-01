import { describe, it, expect } from 'vitest';
import { InputSchema, OutputSchema, CommandSchema } from '../../../src/infrastructure/validation/schemas.js';

describe('Zod Schemas', () => {
    describe('CommandSchema', () => {
        it('should validate addVehicle command', () => {
            const result = CommandSchema.safeParse({
                type: 'addVehicle',
                vehicleId: 'car1',
                startRoad: 'north',
                endRoad: 'south',
            });
            expect(result.success).toBe(true);
        });

        it('should default isEmergency to false', () => {
            const result = CommandSchema.parse({
                type: 'addVehicle',
                vehicleId: 'car1',
                startRoad: 'north',
                endRoad: 'south',
            });
            if (result.type === 'addVehicle') {
                expect(result.isEmergency).toBe(false);
            }
        });

        it('should validate step command', () => {
            const result = CommandSchema.safeParse({ type: 'step' });
            expect(result.success).toBe(true);
        });

        it('should reject invalid command type', () => {
            const result = CommandSchema.safeParse({ type: 'invalid' });
            expect(result.success).toBe(false);
        });

        it('should reject invalid direction', () => {
            const result = CommandSchema.safeParse({
                type: 'addVehicle',
                vehicleId: 'car1',
                startRoad: 'northwest',
                endRoad: 'south',
            });
            expect(result.success).toBe(false);
        });

        it('should reject empty vehicleId', () => {
            const result = CommandSchema.safeParse({
                type: 'addVehicle',
                vehicleId: '',
                startRoad: 'north',
                endRoad: 'south',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('InputSchema', () => {
        it('should validate valid input', () => {
            const result = InputSchema.safeParse({
                commands: [
                    { type: 'addVehicle', vehicleId: 'car1', startRoad: 'north', endRoad: 'south' },
                    { type: 'step' },
                ],
            });
            expect(result.success).toBe(true);
        });

        it('should reject missing commands', () => {
            const result = InputSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe('OutputSchema', () => {
        it('should validate valid output', () => {
            const result = OutputSchema.safeParse({
                stepStatuses: [{ leftVehicles: ['car1', 'car2'] }],
            });
            expect(result.success).toBe(true);
        });
    });
});
