import { writeFile } from 'node:fs/promises';
import type { OutputData } from '../validation/schemas.js';

export class JsonWriter {
    /**
     * Write simulation results to a JSON output file.
     * @param filePath - Path to write the JSON file
     * @param data - Output data to serialize
     */
    static async write(filePath: string, data: OutputData): Promise<void> {
        const jsonString = JSON.stringify(data, null, 2);
        await writeFile(filePath, jsonString, 'utf-8');
    }
}
