import { z } from 'zod';

// Single site note — shared by online POST and each item in the sync batch
export const siteNoteSchema = z
  .object({
    projectId: z.string().uuid('projectId must be a UUID'),
    localId: z.string().uuid('localId must be a UUID'),
    noteText: z.string().trim().optional(),
    photoUrl: z.string().url('photoUrl must be a valid URL').optional(),
    photoLocalKey: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    capturedAt: z.string().datetime('capturedAt must be an ISO datetime string'),
  })
  // At least one of noteText or photoUrl must be present
  .refine((d) => (d.noteText && d.noteText.length > 0) || d.photoUrl, {
    message: 'At least one of noteText or photoUrl is required',
    path: ['noteText'],
  });

// Sync batch — array of notes, max 50
export const syncBatchSchema = z
  .array(siteNoteSchema)
  .min(1, 'Batch must contain at least one note')
  .max(50, 'Batch cannot exceed 50 notes per request');

export type SiteNoteInput = z.infer<typeof siteNoteSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
