import { z } from 'zod';

export const projectStatusEnum = z.enum(['active', 'on_hold', 'completed', 'cancelled']);

export const projectPhaseEnum = z.enum([
  'drawing',
  'building',
  'finishing',
  'electrical',
  'plumbing',
  'door_window',
  'railing',
  'complete',
]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  clientId: z.string().uuid('Invalid client ID'),
  addressLine1: z.string().trim().optional().or(z.literal('')),
  addressLine2: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  state: z.string().trim().optional().or(z.literal('')),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('')),
  status: projectStatusEnum.default('active'),
  currentPhase: projectPhaseEnum.default('drawing'),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
