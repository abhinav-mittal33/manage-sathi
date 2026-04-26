import { z } from 'zod';

export const drawingTypeEnum = z.enum([
  'brief',
  'planning',
  'structural',
  'mep_electrical',
  'mep_plumbing',
  'mep_hvac',
  'exterior_design',
  'interior_drawing',
]);

export const drawingStatusEnum = z.enum(['not_started', 'submitted', 'approved', 'revised']);

export type DrawingType = z.infer<typeof drawingTypeEnum>;
export type DrawingStatus = z.infer<typeof drawingStatusEnum>;

export const ALL_DRAWING_TYPES: DrawingType[] = [
  'brief',
  'planning',
  'structural',
  'mep_electrical',
  'mep_plumbing',
  'mep_hvac',
  'exterior_design',
  'interior_drawing',
];

export const createDrawingSchema = z.object({
  drawingType: drawingTypeEnum,
  notes: z.string().trim().max(1000).optional(),
});

export type CreateDrawingInput = z.infer<typeof createDrawingSchema>;

export const updateDrawingSchema = z.object({
  action: z.enum(['submit', 'revise', 'approve', 'request_changes']),
  notes: z.string().trim().max(1000).optional(),
  fileUrl: z.string().url().optional(),
});

export type UpdateDrawingInput = z.infer<typeof updateDrawingSchema>;

export const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(100),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export const webhookApprovalSchema = z.object({
  drawingId: z.string().uuid(),
  action: z.enum(['approved', 'changes_requested']),
  clientPhone: z.string().trim().min(1),
  replyText: z.string().optional(),
  whatsappMessageId: z.string().optional(),
});

export type WebhookApprovalInput = z.infer<typeof webhookApprovalSchema>;
