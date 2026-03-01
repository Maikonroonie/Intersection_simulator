import { readFile } from 'node:fs/promises';
import { InputSchema, type InputData } from '../validation/schemas.js';

export class JsonReader {
    /**
     * Read and validate a JSON input file.
     * @param filePath - Path to the JSON file
     * @returns Parsed and validated input data
     * @throws Error if file doesn't exist or validation fails
     */
    static async read(filePath: string): Promise<InputData> {
        const rawContent = await readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(rawContent);
        return InputSchema.parse(jsonData);
    }
}
