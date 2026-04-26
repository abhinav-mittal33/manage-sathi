import {
  verifyProjectOwnership,
  listDrawingsForProject,
  getDrawingById,
  getDrawingByIdInternal,
  drawingExistsForType,
  insertDrawing,
  markDrawingSubmitted,
  insertRevisionRow,
  approveDrawing,
  markDrawingRevised,
  findPendingDrawingByClientPhone,
  type DrawingSlot,
  type DrawingRow,
} from '@/lib/dal/drawing.dal';
import { getProjectById } from '@/lib/dal/project.dal';
import { generateFileKey, getPresignedUploadUrl, getPublicUrl } from '@/lib/storage';
import { sendDrawingForApproval } from '@/lib/whatsapp';
import type {
  CreateDrawingInput,
  UpdateDrawingInput,
  UploadRequestInput,
  WebhookApprovalInput,
} from '@/lib/validations/drawing';

export type { DrawingSlot, DrawingRow };

// ─── List all 8 drawing slots for a project ──────────────────────────────────

export async function getDrawingsForProject(
  projectId: string,
  firmId: string
): Promise<DrawingSlot[]> {
  const projectExists = await verifyProjectOwnership(projectId, firmId);
  if (!projectExists) return [];
  return listDrawingsForProject(projectId, firmId);
}

// ─── Create a new drawing row (first version) ────────────────────────────────

export interface CreateDrawingResult {
  drawing: DrawingRow;
  conflict: boolean;
}

export async function createDrawing(
  projectId: string,
  firmId: string,
  input: CreateDrawingInput
): Promise<CreateDrawingResult> {
  const projectExists = await verifyProjectOwnership(projectId, firmId);
  if (!projectExists) {
    // Caller should surface this as 404 — returning conflict=false with null drawing not ideal
    // so throw a typed error the route can catch
    throw new NotFoundError('Project not found');
  }

  const alreadyExists = await drawingExistsForType(projectId, firmId, input.drawingType);
  if (alreadyExists) {
    return { drawing: null as unknown as DrawingRow, conflict: true };
  }

  const drawing = await insertDrawing(firmId, projectId, input);
  return { drawing, conflict: false };
}

// ─── Get a single drawing ─────────────────────────────────────────────────────

export async function getDrawing(
  drawingId: string,
  projectId: string,
  firmId: string
): Promise<DrawingRow | null> {
  const drawing = await getDrawingById(drawingId, firmId);
  if (!drawing || drawing.projectId !== projectId) return null;
  return drawing;
}

// ─── Update drawing (submit or revise) ───────────────────────────────────────

export interface UpdateDrawingResult {
  drawing: DrawingRow;
  invalidTransition?: string;
}

export async function updateDrawing(
  drawingId: string,
  projectId: string,
  firmId: string,
  input: UpdateDrawingInput
): Promise<UpdateDrawingResult | null> {
  const existing = await getDrawingById(drawingId, firmId);
  if (!existing || existing.projectId !== projectId) return null;

  if (input.action === 'submit') {
    // Only allowed from 'not_started'
    if (existing.status !== 'not_started') {
      return { drawing: existing, invalidTransition: `Cannot submit from status '${existing.status}'` };
    }

    const updated = await markDrawingSubmitted(drawingId, firmId, {
      fileUrl: input.fileUrl,
      notes: input.notes,
    });

    if (!updated) {
      // Race condition — re-fetch and return current state
      const current = await getDrawingById(drawingId, firmId);
      return {
        drawing: current!,
        invalidTransition: 'Status transition failed — drawing may have already been submitted',
      };
    }

    // Trigger WhatsApp approval flow — failure must NOT fail this request
    try {
      const project = await getProjectById(projectId, firmId);
      if (project?.client) {
        await sendDrawingForApproval(
          { id: updated.id, drawingType: updated.drawingType, version: updated.version, fileUrl: updated.fileUrl },
          { name: project.client.name, phone: project.client.phone },
          { id: project.id, name: project.name }
        );
      }
    } catch (err) {
      console.error('[Drawing] sendDrawingForApproval failed after submit:', err);
    }

    return { drawing: updated };
  }

  if (input.action === 'revise') {
    // Only allowed from 'approved' — creates a new row, does not mutate the existing one
    if (existing.status !== 'approved') {
      return { drawing: existing, invalidTransition: `Cannot revise from status '${existing.status}'` };
    }

    const newRow = await insertRevisionRow(existing, input.notes);
    return { drawing: newRow };
  }

  if (input.action === 'approve') {
    if (existing.status !== 'submitted') {
      return { drawing: existing, invalidTransition: `Cannot approve from status '${existing.status}'` };
    }
    const updated = await approveDrawing(existing.id, 'manual', null);
    if (!updated) {
      const current = await getDrawingById(drawingId, firmId);
      return { drawing: current!, invalidTransition: 'Approval failed — drawing may have already changed status' };
    }
    return { drawing: updated };
  }

  if (input.action === 'request_changes') {
    if (existing.status !== 'submitted') {
      return { drawing: existing, invalidTransition: `Cannot request changes from status '${existing.status}'` };
    }
    const updated = await markDrawingRevised(existing.id);
    if (!updated) {
      const current = await getDrawingById(drawingId, firmId);
      return { drawing: current!, invalidTransition: 'Could not mark drawing for revision' };
    }
    return { drawing: updated };
  }

  // Should never reach here if Zod schema is enforced at the route level
  return { drawing: existing, invalidTransition: 'Unknown action' };
}

// ─── Generate presigned upload URL ───────────────────────────────────────────

export interface UploadUrlResult {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

export async function getDrawingUploadUrl(
  drawingId: string,
  projectId: string,
  firmId: string,
  input: UploadRequestInput
): Promise<UploadUrlResult | null> {
  const drawing = await getDrawingById(drawingId, firmId);
  if (!drawing || drawing.projectId !== projectId) return null;

  const key = generateFileKey(firmId, 'drawing', input.fileName);
  const uploadUrl = await getPresignedUploadUrl(key, input.contentType);
  const fileUrl = getPublicUrl(key);

  return { uploadUrl, fileUrl, key };
}

// ─── Re-trigger WhatsApp approval message ────────────────────────────────────

export interface SendApprovalResult {
  sent: boolean;
  reason?: string;
}

export async function resendDrawingApproval(
  drawingId: string,
  projectId: string,
  firmId: string
): Promise<SendApprovalResult | null> {
  const drawing = await getDrawingById(drawingId, firmId);
  if (!drawing || drawing.projectId !== projectId) return null;

  if (drawing.status !== 'submitted') {
    return { sent: false, reason: `Drawing must be in 'submitted' status, currently '${drawing.status}'` };
  }

  const project = await getProjectById(projectId, firmId);
  if (!project?.client) {
    return { sent: false, reason: 'Project has no associated client' };
  }

  try {
    await sendDrawingForApproval(
      { id: drawing.id, drawingType: drawing.drawingType, version: drawing.version, fileUrl: drawing.fileUrl },
      { name: project.client.name, phone: project.client.phone },
      { id: project.id, name: project.name }
    );
    return { sent: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'WhatsApp notification failed';
    console.error('[Drawing] resendDrawingApproval failed:', err);
    return { sent: false, reason };
  }
}

// ─── Process webhook from n8n (drawing approval / changes requested) ─────────

export interface WebhookResult {
  drawing: DrawingRow | null;
  notFound: boolean;
  invalidTransition?: string;
}

export async function processApprovalWebhook(
  input: WebhookApprovalInput
): Promise<WebhookResult> {
  const drawing = await getDrawingByIdInternal(input.drawingId);
  if (!drawing) return { drawing: null, notFound: true };

  if (input.action === 'approved') {
    const updated = await approveDrawing(drawing.id, input.clientPhone, input.replyText ?? null);
    if (!updated) {
      return {
        drawing,
        notFound: false,
        invalidTransition: `Cannot approve drawing with status '${drawing.status}'`,
      };
    }
    return { drawing: updated, notFound: false };
  }

  if (input.action === 'changes_requested') {
    const updated = await markDrawingRevised(drawing.id);
    if (!updated) {
      return {
        drawing,
        notFound: false,
        invalidTransition: `Cannot mark revised when status is '${drawing.status}'`,
      };
    }
    return { drawing: updated, notFound: false };
  }

  return { drawing, notFound: false };
}

// ─── Process drawing approval reply from incoming WhatsApp (phone-based) ─────
// Used by the unified /incoming-reply webhook — no drawingId in scope, only phone.

export interface DrawingReplyResult {
  drawing: DrawingRow | null;
  skipped: boolean;
  reason?: string;
}

export async function processDrawingReplyByPhone(
  phone: string,
  reply: 'YES' | 'NO',
  opinionText?: string | null,
): Promise<DrawingReplyResult> {
  const drawing = await findPendingDrawingByClientPhone(phone);
  if (!drawing) return { drawing: null, skipped: true, reason: 'no submitted drawing found for this phone' };

  if (reply === 'YES') {
    const updated = await approveDrawing(drawing.id, phone, opinionText ?? null);
    return { drawing: updated, skipped: false };
  } else {
    const updated = await markDrawingRevised(drawing.id);
    return { drawing: updated, skipped: false };
  }
}

// ─── Typed error for project-not-found (surfaced as 404 in the route) ────────

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
