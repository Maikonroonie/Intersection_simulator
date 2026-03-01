import { describe, it, expect } from 'vitest';
import { Intersection } from '../../src/core/domain/entities/Intersection.js';
import { SimulationConfig } from '../../src/core/domain/value-objects/SimulationConfig.js';
import { Direction, ALL_DIRECTIONS } from '../../src/core/domain/value-objects/Direction.js';

// ===== Metrics =====

interface Metrics {
    stepsToClear: number;
    avgWaitTime: number;
    maxWaitTime: number;
    ambulanceExitStep: number;
    totalProcessed: number;
}

/**
 * Run a scenario function that dynamically adds vehicles and steps.
 * The scenario function controls the intersection directly,
 * adding vehicles between steps to simulate real traffic patterns.
 */
function runScenario(
    scenarioFn: (intersection: Intersection) => string[],
    config: Partial<SimulationConfig>,
): Metrics {
    const intersection = new Intersection(config);
    const allExited = scenarioFn(intersection);

    // Map vehicle ID → step it exited (approx = its position in allExited + offset)
    // We need a better approach: track exits per step inside the scenario
    return {
        stepsToClear: intersection.stepCounter,
        avgWaitTime: 0,
        maxWaitTime: 0,
        ambulanceExitStep: 0,
        totalProcessed: allExited.length,
    };
}

interface StepRecord {
    step: number;
    left: string[];
}

function runTracked(
    config: Partial<SimulationConfig>,
    setup: (int: Intersection) => void,
    midStepActions?: Map<number, (int: Intersection) => void>,
    maxSteps: number = 100,
): { records: StepRecord[]; metrics: Metrics } {
    const intersection = new Intersection(config);
    setup(intersection);
    const records: StepRecord[] = [];
    const exitStep = new Map<string, number>();
    let s = 0;

    while (s < maxSteps) {
        let any = false;
        for (const dir of ALL_DIRECTIONS) {
            if (!intersection.getRoad(dir).isEmpty) { any = true; break; }
        }
        if (!any) break;

        // Mid-step actions (add vehicles between steps to create asymmetry)
        if (midStepActions?.has(s)) {
            midStepActions.get(s)!(intersection);
        }

        const left = intersection.step();
        s++;
        records.push({ step: s, left });
        for (const id of left) exitStep.set(id, s);
    }

    const waits = Array.from(exitStep.values());
    const ambIds = [...exitStep.keys()].filter((id) => id.startsWith('amb'));
    const ambWaits = ambIds.map((id) => exitStep.get(id)!);

    return {
        records,
        metrics: {
            stepsToClear: s,
            avgWaitTime: waits.length
                ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 100) / 100
                : 0,
            maxWaitTime: waits.length ? Math.max(...waits) : 0,
            ambulanceExitStep: ambWaits.length ? Math.max(...ambWaits) : 0,
            totalProcessed: exitStep.size,
        },
    };
}

function printResults(title: string, configs: Record<string, Partial<SimulationConfig>>, results: Record<string, Metrics>) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(
        '  ' + 'Config'.padEnd(28) + 'Steps'.padEnd(7) + 'AvgW'.padEnd(7) +
        'MaxW'.padEnd(7) + 'AmbExit'.padEnd(9) + 'Proc'.padEnd(6),
    );
    console.log(`  ${'─'.repeat(62)}`);
    for (const name of Object.keys(configs)) {
        const m = results[name];
        console.log(
            '  ' + name.padEnd(28) + String(m.stepsToClear).padEnd(7) +
            String(m.avgWaitTime).padEnd(7) + String(m.maxWaitTime).padEnd(7) +
            String(m.ambulanceExitStep).padEnd(9) + String(m.totalProcessed).padEnd(6),
        );
    }
}

// ===== Scenario 1: minGreenDuration locks phase, ambulance arrives mid-simulation =====
// N has 6 cars (straight). After step 1, ambulance arrives on E.
// With minGreen=0, algorithm immediately switches to E for the ambulance.
// With minGreen=5, algorithm stays on N for 5 steps, ambulance waits.

describe('Benchmark: minGreenDuration impact on emergency response', () => {
    const CONFIGS: Record<string, Partial<SimulationConfig>> = {
        'minG=0 (instant switch)': { minGreenDuration: 0, emergencyOverrideMinGreen: false },
        'minG=1': { minGreenDuration: 1, emergencyOverrideMinGreen: false },
        'minG=3': { minGreenDuration: 3, emergencyOverrideMinGreen: false },
        'minG=5': { minGreenDuration: 5, emergencyOverrideMinGreen: false },
        'minG=3 + override=ON': { minGreenDuration: 3, emergencyOverrideMinGreen: true },
        'minG=5 + override=ON': { minGreenDuration: 5, emergencyOverrideMinGreen: true },
    };

    const results: Record<string, Metrics> = {};

    for (const [name, config] of Object.entries(CONFIGS)) {
        it(`config: ${name}`, () => {
            const { metrics } = runTracked(
                config,
                (int) => {
                    for (let i = 1; i <= 6; i++) int.addVehicle(`n${i}`, Direction.North, Direction.South);
                },
                new Map([
                    [1, (int) => {
                        // After step 1 (N phase locked in), ambulance arrives on E
                        int.addVehicle('amb1', Direction.East, Direction.West, true);
                        int.addVehicle('e1', Direction.East, Direction.West);
                    }],
                ]),
            );
            results[name] = metrics;
            expect(metrics.totalProcessed).toBe(8);
        });
    }

    it('should show emergency override effect', () => {
        printResults('SCENARIO 1: Ambulance arrives AFTER N phase starts', CONFIGS, results);

        // minG=0 should serve ambulance fastest
        expect(results['minG=0 (instant switch)'].ambulanceExitStep)
            .toBeLessThanOrEqual(results['minG=5'].ambulanceExitStep);

        // Emergency override should help ambulance vs no override at same minG
        expect(results['minG=5 + override=ON'].ambulanceExitStep)
            .toBeLessThanOrEqual(results['minG=5'].ambulanceExitStep);
    });
});

// ===== Scenario 2: maxStarvationTime — minor road starving in heavy traffic =====
// N keeps getting 2 new cars every 2 steps (simulating continuous heavy flow).
// E/W have 2 cars each from the start.
// Low starvation threshold forces E/W to get served sooner.

describe('Benchmark: maxStarvationTime impact on fairness', () => {
    const CONFIGS: Record<string, Partial<SimulationConfig>> = {
        'starv=3': { maxStarvationTime: 3, minGreenDuration: 1 },
        'starv=5': { maxStarvationTime: 5, minGreenDuration: 1 },
        'starv=8': { maxStarvationTime: 8, minGreenDuration: 1 },
        'starv=15': { maxStarvationTime: 15, minGreenDuration: 1 },
        'starv=30': { maxStarvationTime: 30, minGreenDuration: 1 },
    };

    const results: Record<string, Metrics> = {};

    for (const [name, config] of Object.entries(CONFIGS)) {
        it(`config: ${name}`, () => {
            const midActions = new Map<number, (int: Intersection) => void>();
            // Every 2 steps, add 2 more cars to North to keep it as the "busiest" road
            for (let step = 1; step <= 10; step += 2) {
                const s = step;
                midActions.set(s, (int) => {
                    int.addVehicle(`n_late_${s}_1`, Direction.North, Direction.South);
                    int.addVehicle(`n_late_${s}_2`, Direction.North, Direction.South);
                });
            }

            const { metrics } = runTracked(
                config,
                (int) => {
                    for (let i = 1; i <= 4; i++) int.addVehicle(`n${i}`, Direction.North, Direction.South);
                    int.addVehicle('e1', Direction.East, Direction.West);
                    int.addVehicle('e2', Direction.East, Direction.West);
                    int.addVehicle('w1', Direction.West, Direction.East);
                    int.addVehicle('w2', Direction.West, Direction.East);
                },
                midActions,
            );
            results[name] = metrics;
        });
    }

    it('should show starvation impact on max wait', () => {
        printResults('SCENARIO 2: Continuous N traffic, E/W starving', CONFIGS, results);

        // Lower starvation threshold → lower max wait (fairer)
        expect(results['starv=3'].maxWaitTime).toBeLessThanOrEqual(results['starv=30'].maxWaitTime);
    });
});

// ===== Scenario 3: waitTimeWeight — does it help balance wait times? =====
// 1 car on E has been waiting 10 steps (pre-incremented).
// 5 fresh cars on N.
// Higher waitTimeWeight should prioritize the long-waiting E car.

describe('Benchmark: waitTimeWeight impact on fairness', () => {
    const CONFIGS: Record<string, Partial<SimulationConfig>> = {
        'waitW=0.0 (ignore wait)': { waitTimeWeight: 0.0, minGreenDuration: 0 },
        'waitW=0.5': { waitTimeWeight: 0.5, minGreenDuration: 0 },
        'waitW=1.0': { waitTimeWeight: 1.0, minGreenDuration: 0 },
        'waitW=2.0': { waitTimeWeight: 2.0, minGreenDuration: 0 },
        'waitW=5.0': { waitTimeWeight: 5.0, minGreenDuration: 0 },
    };

    const results: Record<string, Metrics> = {};

    for (const [name, config] of Object.entries(CONFIGS)) {
        it(`config: ${name}`, () => {
            const { metrics, records } = runTracked(
                config,
                (int) => {
                    // Add long-waiting car on East
                    int.addVehicle('e_old', Direction.East, Direction.West);
                    // Pre-age: simulate it waiting 10 steps
                    const road = int.getRoad(Direction.East);
                    for (let i = 0; i < 10; i++) road.incrementAllWaitTimes();

                    // Add fresh cars on North
                    for (let i = 1; i <= 5; i++) int.addVehicle(`n${i}`, Direction.North, Direction.South);
                },
            );
            results[name] = metrics;

            // Check which car exits first in step 1
            const firstStep = records[0];
            // With high waitTimeWeight, e_old should exit in step 1
            if (config.waitTimeWeight! >= 2.0) {
                expect(firstStep.left).toContain('e_old');
            }
        });
    }

    it('should show waitTimeWeight impact', () => {
        printResults('SCENARIO 3: 1 old E car (waited 10) vs 5 fresh N cars', CONFIGS, results);
    });
});

// ===== Scenario 4: Left turn phase efficiency =====
// Heavy left turns on N/S + straight traffic on E/W.
// Tests how efficiently different minGreen values handle the phase switching overhead.

describe('Benchmark: Left turn phase switching cost', () => {
    const CONFIGS: Record<string, Partial<SimulationConfig>> = {
        'minG=0': { minGreenDuration: 0 },
        'minG=1': { minGreenDuration: 1 },
        'minG=2': { minGreenDuration: 2 },
        'minG=3': { minGreenDuration: 3 },
        'minG=5': { minGreenDuration: 5 },
    };

    const results: Record<string, Metrics> = {};

    for (const [name, config] of Object.entries(CONFIGS)) {
        it(`config: ${name}`, () => {
            const { metrics } = runTracked(
                config,
                (int) => {
                    // Interleave arrivals: left-turners arrive in waves between straight traffic
                    for (let i = 1; i <= 3; i++) int.addVehicle(`ns${i}`, Direction.North, Direction.South); // straight
                    for (let i = 1; i <= 3; i++) int.addVehicle(`nl${i}`, Direction.North, Direction.East);  // left
                    for (let i = 1; i <= 3; i++) int.addVehicle(`ss${i}`, Direction.South, Direction.North); // straight
                    for (let i = 1; i <= 3; i++) int.addVehicle(`sl${i}`, Direction.South, Direction.West);  // left
                    for (let i = 1; i <= 4; i++) int.addVehicle(`e${i}`, Direction.East, Direction.West);    // straight
                    for (let i = 1; i <= 4; i++) int.addVehicle(`w${i}`, Direction.West, Direction.East);    // straight
                },
            );
            results[name] = metrics;
            expect(metrics.totalProcessed).toBe(20);
        });
    }

    it('should show minGreen impact on mixed-phase clearing', () => {
        printResults('SCENARIO 4: Mixed straight/left N/S + straight E/W', CONFIGS, results);
    });
});
