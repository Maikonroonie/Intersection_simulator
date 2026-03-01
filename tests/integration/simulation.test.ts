import { describe, it, expect } from 'vitest';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { SimulationService } from '../../src/core/services/SimulationService.js';
import { JsonReader } from '../../src/infrastructure/file/JsonReader.js';
import { JsonWriter } from '../../src/infrastructure/file/JsonWriter.js';
import path from 'node:path';

const FIXTURES_DIR = path.resolve(import.meta.dirname, '../fixtures');

describe('Integration: Full simulation flow', () => {
    it('should process sample-input.json correctly', async () => {
        const inputPath = path.join(FIXTURES_DIR, 'sample-input.json');
        const inputData = await JsonReader.read(inputPath);
        const simulation = new SimulationService({ minGreenDuration: 0 });
        const result = simulation.processCommands(inputData.commands);
        expect(result.stepStatuses).toHaveLength(1);
        expect(result.stepStatuses[0].leftVehicles).toContain('ambulance1');
    });

    it('should process complex-input.json correctly', async () => {
        const inputPath = path.join(FIXTURES_DIR, 'complex-input.json');
        const inputData = await JsonReader.read(inputPath);
        const simulation = new SimulationService({ minGreenDuration: 0 });
        const result = simulation.processCommands(inputData.commands);
        expect(result.stepStatuses).toHaveLength(5);
        const allLeft = result.stepStatuses.flatMap((s) => s.leftVehicles);
        expect(allLeft.length).toBeGreaterThanOrEqual(4);
    });

    it('should write and read valid output JSON', async () => {
        const simulation = new SimulationService({ minGreenDuration: 0 });
        const result = simulation.processCommands([
            { type: 'addVehicle', vehicleId: 'test1', startRoad: 'north', endRoad: 'south' },
            { type: 'step' },
        ]);
        const outputPath = path.join(FIXTURES_DIR, 'test-output.json');
        await JsonWriter.write(outputPath, result);
        const content = await readFile(outputPath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.stepStatuses[0].leftVehicles).toContain('test1');
        await unlink(outputPath);
    });

    it('should reject invalid input JSON', async () => {
        const invalidPath = path.join(FIXTURES_DIR, 'invalid-input.json');
        await writeFile(invalidPath, JSON.stringify({ commands: [{ type: 'invalidCommand' }] }));
        await expect(JsonReader.read(invalidPath)).rejects.toThrow();
        await unlink(invalidPath);
    });

    it('should handle empty commands array', () => {
        const simulation = new SimulationService({ minGreenDuration: 0 });
        expect(simulation.processCommands([]).stepStatuses).toHaveLength(0);
    });

    it('should handle multiple vehicles then steps', () => {
        const simulation = new SimulationService({ minGreenDuration: 0 });
        const result = simulation.processCommands([
            { type: 'addVehicle', vehicleId: 'car1', startRoad: 'north', endRoad: 'south' },
            { type: 'addVehicle', vehicleId: 'car2', startRoad: 'south', endRoad: 'north' },
            { type: 'addVehicle', vehicleId: 'car3', startRoad: 'east', endRoad: 'west' },
            { type: 'addVehicle', vehicleId: 'car4', startRoad: 'west', endRoad: 'east' },
            { type: 'step' },
            { type: 'step' },
        ]);
        const allLeft = result.stepStatuses.flatMap((s) => s.leftVehicles);
        expect(allLeft).toHaveLength(4);
    });

    it('should ensure no collision: N and E vehicles never leave in same step', () => {
        const simulation = new SimulationService({ minGreenDuration: 0 });
        const result = simulation.processCommands([
            { type: 'addVehicle', vehicleId: 'carN', startRoad: 'north', endRoad: 'south' },
            { type: 'addVehicle', vehicleId: 'carE', startRoad: 'east', endRoad: 'west' },
            { type: 'step' },
        ]);
        const step = result.stepStatuses[0];
        const hasN = step.leftVehicles.includes('carN');
        const hasE = step.leftVehicles.includes('carE');
        expect(hasN && hasE).toBe(false);
    });
});
