import { JsonReader } from '../infrastructure/file/JsonReader.js';
import { JsonWriter } from '../infrastructure/file/JsonWriter.js';
import { SimulationService } from '../core/services/SimulationService.js';
import { WebSocketServerWrapper } from '../infrastructure/websocket/WebSocketServer.js';
import { Direction, ALL_DIRECTIONS } from '../core/domain/value-objects/Direction.js';

interface CliArgs {
    inputFile: string;
    outputFile: string;
    live: boolean;
}

function parseArgs(args: string[]): CliArgs {
    // Filter out node and script path
    const userArgs = args.slice(2);

    const live = userArgs.includes('--live');
    const fileArgs = userArgs.filter((a) => !a.startsWith('--'));

    if (fileArgs.length < 2) {
        console.error('Usage: npm start -- <input.json> <output.json> [--live]');
        process.exit(1);
    }

    return {
        inputFile: fileArgs[0],
        outputFile: fileArgs[1],
        live,
    };
}

export async function run(): Promise<void> {
    const { inputFile, outputFile, live } = parseArgs(process.argv);

    console.log(`[CLI] Reading input from: ${inputFile}`);

    let wsServer: WebSocketServerWrapper | undefined;

    try {
        // Read and validate input
        const inputData = await JsonReader.read(inputFile);
        console.log(`[CLI] Loaded ${inputData.commands.length} commands`);

        // Start WebSocket server if live mode
        if (live) {
            wsServer = new WebSocketServerWrapper(8080);
            await wsServer.start();
            console.log('[CLI] Live mode enabled. Connect WebSocket client to ws://localhost:8080');
            // Give clients a moment to connect
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Create simulation service and process commands
        const simulation = new SimulationService();

        // Process commands with optional live broadcasting
        const result = simulation.processCommands(inputData.commands);

        // If live mode, broadcast events for each step
        if (wsServer) {
            const intersection = simulation.getIntersection();
            for (let i = 0; i < result.stepStatuses.length; i++) {
                const status = result.stepStatuses[i];
                const roads: Record<string, { queueLength: number; lightState: string }> = {};

                for (const dir of ALL_DIRECTIONS) {
                    const road = intersection.getRoad(dir);
                    roads[dir] = {
                        queueLength: road.length,
                        lightState: road.trafficLight.state,
                    };
                }

                wsServer.broadcast({
                    type: 'stepUpdate',
                    data: {
                        step: i + 1,
                        leftVehicles: status.leftVehicles,
                        roads,
                    },
                });
            }
        }

        // Write output
        await JsonWriter.write(outputFile, result);
        console.log(`[CLI] Output written to: ${outputFile}`);
        console.log(`[CLI] Total steps: ${result.stepStatuses.length}`);

        let totalLeft = 0;
        for (const status of result.stepStatuses) {
            totalLeft += status.leftVehicles.length;
        }
        console.log(`[CLI] Total vehicles that left: ${totalLeft}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`[CLI] Error: ${error.message}`);
        } else {
            console.error('[CLI] Unknown error', error);
        }
        process.exit(1);
    } finally {
        if (wsServer) {
            await wsServer.stop();
        }
    }
}
