import { z } from 'zod';

export const AddVehicleCommandSchema = z.object({
    type: z.literal('addVehicle'),
    vehicleId: z.string().min(1),
    startRoad: z.enum(['north', 'south', 'east', 'west']),
    endRoad: z.enum(['north', 'south', 'east', 'west']),
    isEmergency: z.boolean().optional().default(false),
});

export const StepCommandSchema = z.object({
    type: z.literal('step'),
});

export const CommandSchema = z.discriminatedUnion('type', [
    AddVehicleCommandSchema,
    StepCommandSchema,
]);

export const InputSchema = z.object({
    commands: z.array(CommandSchema),
});

export const OutputSchema = z.object({
    stepStatuses: z.array(
        z.object({
            leftVehicles: z.array(z.string()),
        }),
    ),
});

export type InputData = z.infer<typeof InputSchema>;
export type OutputData = z.infer<typeof OutputSchema>;
export type CommandData = z.infer<typeof CommandSchema>;
