import { Direction } from './Direction.js';

/**
 * TurnType — the vehicle's actual turn direction (driver's perspective).
 * This is computed from startRoad → endRoad.
 */
export type TurnType = 'left' | 'straight' | 'right';

/**
 * LaneType — the physical lane on the road.
 * Classic 2-lane intersection: left turn lane + straight/right lane.
 */
export type LaneType = 'left' | 'straight_right';

export const ALL_TURN_TYPES: TurnType[] = ['left', 'straight', 'right'];
export const ALL_LANE_TYPES: LaneType[] = ['left', 'straight_right'];

/**
 * Determine the turn type based on start and end road.
 * Right-hand traffic rules (driver's perspective):
 *
 * From North (heading south): left=East, straight=South, right=West
 * From South (heading north): left=West, straight=North, right=East
 * From East  (heading west):  left=South, straight=West, right=North
 * From West  (heading east):  left=North, straight=East, right=South
 */
export function determineTurnType(startRoad: Direction, endRoad: Direction): TurnType {
    const turnMap: Record<Direction, Partial<Record<Direction, TurnType>>> = {
        [Direction.North]: {
            [Direction.East]: 'left',
            [Direction.South]: 'straight',
            [Direction.West]: 'right',
        },
        [Direction.South]: {
            [Direction.West]: 'left',
            [Direction.North]: 'straight',
            [Direction.East]: 'right',
        },
        [Direction.East]: {
            [Direction.South]: 'left',
            [Direction.West]: 'straight',
            [Direction.North]: 'right',
        },
        [Direction.West]: {
            [Direction.North]: 'left',
            [Direction.East]: 'straight',
            [Direction.South]: 'right',
        },
    };
    const turn = turnMap[startRoad]?.[endRoad];
    if (!turn) {
        throw new Error(`Cannot determine turn type for ${startRoad} → ${endRoad}`);
    }
    return turn;
}

/**
 * Map a vehicle's turn type to the physical lane it should use.
 * - left turn → left lane
 * - straight or right turn → straight_right lane
 */
export function turnTypeToLane(turnType: TurnType): LaneType {
    return turnType === 'left' ? 'left' : 'straight_right';
}
