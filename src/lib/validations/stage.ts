import { z } from 'zod';

// UUID regex — used to validate route params before hitting the DB
const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

export const stageIdSchema = uuidSchema;
export const projectIdSchema = uuidSchema;

// PUT /api/v1/projects/[id]/stages/[stageId]
// Client sends explicit desired state — not a blind server-side flip
export const toggleStageSchema = z.object({
  isCompleted: z.boolean({
    required_error: 'isCompleted is required',
    invalid_type_error: 'isCompleted must be a boolean',
  }),
});

export type ToggleStageInput = z.infer<typeof toggleStageSchema>;
