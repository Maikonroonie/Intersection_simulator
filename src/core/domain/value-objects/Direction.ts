export enum Direction {
    North = 'north',
    South = 'south',
    East = 'east',
    West = 'west',
}

export const ALL_DIRECTIONS: Direction[] = [
    Direction.North,
    Direction.South,
    Direction.East,
    Direction.West,
];

export function parseDirection(value: string): Direction {
    const map: Record<string, Direction> = {
        north: Direction.North,
        south: Direction.South,
        east: Direction.East,
        west: Direction.West,
    };
    const dir = map[value.toLowerCase()];
    if (!dir) {
        throw new Error(`Invalid direction: ${value}`);
    }
    return dir;
}
