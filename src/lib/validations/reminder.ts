import { z } from 'zod';

export const createReminderSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  reminderType: z
    .enum(['drawing_deadline', 'project_completion', 'client_meeting', 'general'])
    .default('general'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD'),
  notes: z.string().max(1000).optional(),
});

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  reminderType: z
    .enum(['drawing_deadline', 'project_completion', 'client_meeting', 'general'])
    .optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD')
    .optional(),
  notes: z.string().max(1000).nullable().optional(),
  isCompleted: z.boolean().optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type ReminderType = 'drawing_deadline' | 'project_completion' | 'client_meeting' | 'general';
