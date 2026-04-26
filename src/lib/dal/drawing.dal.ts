import { eq, and, isNull, ne, max, inArray, desc } from 'drizzle-orm';
import { db } from '@/db';
import { drawings, projects, clients } from '@/db/schema';
import type { CreateDrawingInput } from '@/lib/validations/drawing';
import { ALL_DRAWING_TYPES, type DrawingType, type DrawingStatus } from '@/lib/validations/drawing';

export type DrawingRow = typeof drawings.$inferSelect;

// Shape returned for each drawing type — present even when no DB row exists
export interface DrawingSlot {
  id: string | null;
  firmId: string | null;
  projectId: string;
  drawingType: DrawingType;
  status: DrawingStatus;
  version: number | null;
  fileUrl: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  notes: string | null;
  clientSuggestion: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Verify a project exists and belongs to this firm — guards cross-firm access
export async function verifyProjectOwnership(
  projectId: string,
  firmId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.firmId, firmId), isNull(projects.deletedAt)))
    .limit(1);
  return !!row;
}

// Return the MAX(version) row per drawing type for a project.
// Fills in empty slots for drawing types with no DB row.
export async function listDrawingsForProject(
  projectId: string,
  firmId: string
): Promise<DrawingSlot[]> {
  // Fetch max version per type in one query
  const maxVersionRows = await db
    .select({ drawingType: drawings.drawingType, maxVersion: max(drawings.version) })
    .from(drawings)
    .where(and(eq(drawings.projectId, projectId), eq(drawings.firmId, firmId), isNull(drawings.deletedAt)))
    .groupBy(drawings.drawingType);

  if (maxVersionRows.length === 0) {
    // No drawings yet — return empty slots for all 8 types
    return ALL_DRAWING_TYPES.map((drawingType) => emptySlot(projectId, drawingType));
  }

  // Build lookup: drawingType → maxVersion
  const maxVersionMap = new Map<string, number>(
    maxVersionRows
      .filter((r) => r.maxVersion !== null)
      .map((r) => [r.drawingType, r.maxVersion as number])
  );

  // Fetch the actual rows matching maxVersion per type
  const orConditions = Array.from(maxVersionMap.entries()).map(([type, version]) =>
    and(
      eq(drawings.drawingType, type),
      eq(drawings.version, version),
      eq(drawings.projectId, projectId),
      eq(drawings.firmId, firmId),
      isNull(drawings.deletedAt)
    )
  );

  // Use inArray on a composite isn't possible with Drizzle directly;
  // fetch all relevant types and filter client-side (bounded to 8 rows max)
  const types = Array.from(maxVersionMap.keys());
  const rows = await db
    .select()
    .from(drawings)
    .where(
      and(
        eq(drawings.projectId, projectId),
        eq(drawings.firmId, firmId),
        isNull(drawings.deletedAt),
        inArray(drawings.drawingType, types)
      )
    );

  // Among fetched rows keep only the max-version row per type
  const latestByType = new Map<string, DrawingRow>();
  for (const row of rows) {
    const existing = latestByType.get(row.drawingType);
    if (!existing || row.version > existing.version) {
      latestByType.set(row.drawingType, row);
    }
  }

  // Suppress unused variable warning — orConditions was the original plan but
  // the inArray + client-side filter is simpler for 8 types. Void it.
  void orConditions;

  return ALL_DRAWING_TYPES.map((drawingType) => {
    const row = latestByType.get(drawingType);
    return row ? rowToSlot(row) : emptySlot(projectId, drawingType);
  });
}

// Get a single drawing row by id, guarded by firmId
export async function getDrawingById(
  id: string,
  firmId: string
): Promise<DrawingRow | null> {
  const [row] = await db
    .select()
    .from(drawings)
    .where(and(eq(drawings.id, id), eq(drawings.firmId, firmId), isNull(drawings.deletedAt)))
    .limit(1);
  return row ?? null;
}

// Get a drawing by id without firmId guard — used internally (e.g. webhook)
export async function getDrawingByIdInternal(id: string): Promise<DrawingRow | null> {
  const [row] = await db
    .select()
    .from(drawings)
    .where(and(eq(drawings.id, id), isNull(drawings.deletedAt)))
    .limit(1);
  return row ?? null;
}

// Check whether a drawing already exists for (projectId, drawingType) at any version
export async function drawingExistsForType(
  projectId: string,
  firmId: string,
  drawingType: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: drawings.id })
    .from(drawings)
    .where(
      and(
        eq(drawings.projectId, projectId),
        eq(drawings.firmId, firmId),
        eq(drawings.drawingType, drawingType),
        isNull(drawings.deletedAt)
      )
    )
    .limit(1);
  return !!row;
}

// Insert a new drawing row (always version=1 for first creation)
export async function insertDrawing(
  firmId: string,
  projectId: string,
  input: CreateDrawingInput
): Promise<DrawingRow> {
  const [row] = await db
    .insert(drawings)
    .values({
      firmId,
      projectId,
      drawingType: input.drawingType,
      status: 'not_started',
      version: 1,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

// Mark a drawing as submitted — only valid from 'not_started'
export async function markDrawingSubmitted(
  id: string,
  firmId: string,
  opts: { fileUrl?: string; notes?: string }
): Promise<DrawingRow | null> {
  const updateValues: Partial<typeof drawings.$inferInsert> = {
    status: 'submitted',
    submittedAt: new Date(),
    updatedAt: new Date(),
  };
  if (opts.fileUrl !== undefined) updateValues.fileUrl = opts.fileUrl;
  if (opts.notes !== undefined) updateValues.notes = opts.notes;

  const [row] = await db
    .update(drawings)
    .set(updateValues)
    .where(
      and(
        eq(drawings.id, id),
        eq(drawings.firmId, firmId),
        eq(drawings.status, 'not_started'),
        isNull(drawings.deletedAt)
      )
    )
    .returning();
  return row ?? null;
}

// Insert a new version row when an approved drawing is revised.
// The existing row is NOT modified — revision creates a new row.
export async function insertRevisionRow(
  original: DrawingRow,
  notes?: string
): Promise<DrawingRow> {
  const [row] = await db
    .insert(drawings)
    .values({
      firmId: original.firmId,
      projectId: original.projectId,
      drawingType: original.drawingType,
      status: 'not_started',
      version: original.version + 1,
      notes: notes ?? null,
    })
    .returning();
  return row;
}

// Webhook: approve a submitted drawing
export async function approveDrawing(
  id: string,
  approvedBy: string,
  clientSuggestion?: string | null,
): Promise<DrawingRow | null> {
  const setValues: Record<string, unknown> = {
    status: 'approved',
    approvedAt: new Date(),
    approvedBy,
    updatedAt: new Date(),
  };
  if (clientSuggestion != null) setValues.clientSuggestion = clientSuggestion;
  const [row] = await db
    .update(drawings)
    .set(setValues)
    .where(and(eq(drawings.id, id), eq(drawings.status, 'submitted'), isNull(drawings.deletedAt)))
    .returning();
  return row ?? null;
}

// Webhook: mark a submitted drawing as needing changes
export async function markDrawingRevised(id: string): Promise<DrawingRow | null> {
  const [row] = await db
    .update(drawings)
    .set({ status: 'revised', updatedAt: new Date() })
    .where(and(eq(drawings.id, id), eq(drawings.status, 'submitted'), isNull(drawings.deletedAt)))
    .returning();
  return row ?? null;
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function rowToSlot(row: DrawingRow): DrawingSlot {
  return {
    id: row.id,
    firmId: row.firmId,
    projectId: row.projectId,
    drawingType: row.drawingType as DrawingType,
    status: row.status as DrawingStatus,
    version: row.version,
    fileUrl: row.fileUrl,
    submittedAt: row.submittedAt,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    notes: row.notes,
    clientSuggestion: row.clientSuggestion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function emptySlot(projectId: string, drawingType: DrawingType): DrawingSlot {
  return {
    id: null,
    firmId: null,
    projectId,
    drawingType,
    status: 'not_started',
    version: null,
    fileUrl: null,
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    notes: null,
    clientSuggestion: null,
    createdAt: null,
    updatedAt: null,
  };
}

// All versions of a drawing type for a project — newest first. Used by history panel.
export async function listDrawingVersionsForType(
  projectId: string,
  firmId: string,
  drawingType: string
): Promise<DrawingRow[]> {
  return db
    .select()
    .from(drawings)
    .where(
      and(
        eq(drawings.projectId, projectId),
        eq(drawings.firmId, firmId),
        eq(drawings.drawingType, drawingType),
        isNull(drawings.deletedAt)
      )
    )
    .orderBy(desc(drawings.version));
}

// Find the most recent submitted drawing for a client — used by incoming WhatsApp webhook.
// Tries all 4 common Indian phone formats, falls back to most-recent submitted when phone
// can't be matched (e.g. WhatsApp @lid privacy JIDs).
export async function findPendingDrawingByClientPhone(
  phone: string
): Promise<DrawingRow | null> {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const possibleFormats = ['+91' + last10, '91' + last10, last10, '0' + last10];

  const [byPhone] = await db
    .select({ drawing: drawings })
    .from(drawings)
    .innerJoin(projects, eq(drawings.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(drawings.status, 'submitted'),
        isNull(drawings.deletedAt),
        isNull(projects.deletedAt),
        inArray(clients.phone, possibleFormats)
      )
    )
    .orderBy(desc(drawings.submittedAt))
    .limit(1);

  if (byPhone) return byPhone.drawing;

  // @lid JID fallback removed: returning null is safer than approving an arbitrary drawing
  // when the sender's phone can't be matched. Architect can approve manually in the UI.
  return null;
}

// Most recent drawing with actual activity (not 'not_started') for a project.
// Used by project detail page to show last drawing info.
export async function getLatestDrawingForProject(
  projectId: string,
  firmId: string
): Promise<DrawingRow | null> {
  const [row] = await db
    .select()
    .from(drawings)
    .where(
      and(
        eq(drawings.projectId, projectId),
        eq(drawings.firmId, firmId),
        ne(drawings.status, 'not_started'),
        isNull(drawings.deletedAt)
      )
    )
    .orderBy(desc(drawings.submittedAt))
    .limit(1);
  return row ?? null;
}
