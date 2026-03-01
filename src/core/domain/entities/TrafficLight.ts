export type TrafficLightState = 'green' | 'red';

export class TrafficLight {
    private _state: TrafficLightState;

    constructor(initialState: TrafficLightState = 'red') {
        this._state = initialState;
    }

    get state(): TrafficLightState {
        return this._state;
    }

    get isGreen(): boolean {
        return this._state === 'green';
    }

    get isRed(): boolean {
        return this._state === 'red';
    }

    setGreen(): void {
        this._state = 'green';
    }

    setRed(): void {
        this._state = 'red';
    }

    setState(state: TrafficLightState): void {
        this._state = state;
    }
}
