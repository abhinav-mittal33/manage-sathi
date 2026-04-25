import { z } from 'zod';

export const NOTE_TYPES = ['site_visit', 'personal', 'approval_request'] as const;
export type NoteType = typeof NOTE_TYPES[number];

export const siteNoteSchema = z
  .object({
    projectId: z.string().uuid('projectId must be a UUID'),
    localId: z.string().uuid('localId must be a UUID'),
    noteType: z.enum(NOTE_TYPES).default('personal'),
    noteText: z.string().trim().optional(),
    photoUrl: z.string().url('photoUrl must be a valid URL').optional(),
    photoLocalKey: z.string().optional(),
    // base64-encoded compressed photo — used when R2 is not configured (local dev)
    photoBase64: z.string().optional(),
    photoMimeType: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    capturedAt: z.string().datetime('capturedAt must be an ISO datetime string'),
  })
  .refine((d) => (d.noteText && d.noteText.length > 0) || d.photoUrl || d.photoLocalKey || d.photoBase64, {
    message: 'At least one of noteText, photoUrl, photoLocalKey, or photoBase64 is required',
    path: ['noteText'],
  });

export const syncBatchSchema = z
  .array(siteNoteSchema)
  .min(1, 'Batch must contain at least one note')
  .max(50, 'Batch cannot exceed 50 notes per request');

export type SiteNoteInput = z.infer<typeof siteNoteSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
