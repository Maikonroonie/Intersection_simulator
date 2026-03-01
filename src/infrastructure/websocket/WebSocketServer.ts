import { WebSocketServer as WSSServer, WebSocket } from 'ws';

export interface StepUpdateEvent {
    type: 'stepUpdate';
    data: {
        step: number;
        leftVehicles: string[];
        roads: Record<string, { queueLength: number; lightState: string }>;
    };
}

export interface VehicleAddedEvent {
    type: 'vehicleAdded';
    data: {
        vehicleId: string;
        startRoad: string;
        endRoad: string;
        isEmergency: boolean;
    };
}

export interface PhaseChangeEvent {
    type: 'phaseChange';
    data: {
        activeDirections: string[];
    };
}

export type WSEvent = StepUpdateEvent | VehicleAddedEvent | PhaseChangeEvent;

export class WebSocketServerWrapper {
    private wss: WSSServer | null = null;
    private clients: Set<WebSocket> = new Set();
    private readonly port: number;

    constructor(port: number = 8080) {
        this.port = port;
    }

    start(): Promise<void> {
        return new Promise((resolve) => {
            this.wss = new WSSServer({ port: this.port });

            this.wss.on('connection', (ws: WebSocket) => {
                this.clients.add(ws);
                console.log(`[WebSocket] Client connected. Total: ${this.clients.size}`);

                ws.on('close', () => {
                    this.clients.delete(ws);
                    console.log(`[WebSocket] Client disconnected. Total: ${this.clients.size}`);
                });
            });

            this.wss.on('listening', () => {
                console.log(`[WebSocket] Server listening on port ${this.port}`);
                resolve();
            });
        });
    }

    broadcast(event: WSEvent): void {
        const message = JSON.stringify(event);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.wss) {
                resolve();
                return;
            }
            // Close all client connections
            for (const client of this.clients) {
                client.close();
            }
            this.clients.clear();
            this.wss.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
