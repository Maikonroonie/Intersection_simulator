import { Direction } from '../value-objects/Direction.js';
import { LaneType } from '../value-objects/TurnType.js';

/**
 * A Maneuver describes which lanes are active for a given direction in a phase.
 */
export interface Maneuver {
    direction: Direction;
    lanes: LaneType[];
}

/**
 * A Phase is a set of non-conflicting maneuvers that can have green simultaneously.
 */
export interface Phase {
    name: string;
    maneuvers: Maneuver[];
}

/**
 * 4 traffic phases for a classic 2-lane intersection (right-hand traffic):
 *
 * 1. NS_MAIN:  North & South → straight_right lane (straight + right turns)
 * 2. NS_LEFT:  North & South → left lane (left turns only)
 * 3. EW_MAIN:  East & West → straight_right lane
 * 4. EW_LEFT:  East & West → left lane
 */
export const PHASES: Phase[] = [
    {
        name: 'NS_MAIN',
        maneuvers: [
            { direction: Direction.North, lanes: ['straight_right'] },
            { direction: Direction.South, lanes: ['straight_right'] },
        ],
    },
    {
        name: 'NS_LEFT',
        maneuvers: [
            { direction: Direction.North, lanes: ['left'] },
            { direction: Direction.South, lanes: ['left'] },
        ],
    },
    {
        name: 'EW_MAIN',
        maneuvers: [
            { direction: Direction.East, lanes: ['straight_right'] },
            { direction: Direction.West, lanes: ['straight_right'] },
        ],
    },
    {
        name: 'EW_LEFT',
        maneuvers: [
            { direction: Direction.East, lanes: ['left'] },
            { direction: Direction.West, lanes: ['left'] },
        ],
    },
];

export class CollisionDetector {
    private readonly phases: Phase[];

    constructor() {
        this.phases = [...PHASES];
    }

    getValidPhases(): Phase[] {
        return [...this.phases];
    }

    getPhaseDirections(phase: Phase): Direction[] {
        return phase.maneuvers.map((m) => m.direction);
    }

    areDirectionsCompatible(a: Direction, b: Direction): boolean {
        return this.phases.some((phase) => {
            const dirs = this.getPhaseDirections(phase);
            return dirs.includes(a) && dirs.includes(b);
        });
    }

    canActivateSimultaneously(directions: Direction[]): boolean {
        if (directions.length <= 1) return true;
        for (let i = 0; i < directions.length; i++) {
            for (let j = i + 1; j < directions.length; j++) {
                if (!this.areDirectionsCompatible(directions[i], directions[j])) {
                    return false;
                }
            }
        }
        return true;
    }

    findPhasesForDirection(direction: Direction): Phase[] {
        return this.phases.filter((phase) =>
            phase.maneuvers.some((m) => m.direction === direction),
        );
    }
}
