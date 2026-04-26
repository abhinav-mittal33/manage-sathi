import { eq, and, isNull, isNotNull, desc, lt, lte, gt, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { siteNotes, projects, clients } from '@/db/schema';
import type { SiteNoteInput, NoteType } from '@/lib/validations/site-note';

export type SiteNoteRow = typeof siteNotes.$inferSelect;

const NOTE_COLUMNS = {
  id: siteNotes.id,
  firmId: siteNotes.firmId,
  projectId: siteNotes.projectId,
  localId: siteNotes.localId,
  authorId: siteNotes.authorId,
  noteType: siteNotes.noteType,
  approvalStatus: siteNotes.approvalStatus,
  clientResponseText: siteNotes.clientResponseText,
  noteText: siteNotes.noteText,
  photoUrl: siteNotes.photoUrl,
  photoLocalKey: siteNotes.photoLocalKey,
  latitude: siteNotes.latitude,
  longitude: siteNotes.longitude,
  capturedAt: siteNotes.capturedAt,
  syncedAt: siteNotes.syncedAt,
  whatsappSent: siteNotes.whatsappSent,
  createdAt: siteNotes.createdAt,
  updatedAt: siteNotes.updatedAt,
  deletedAt: siteNotes.deletedAt,
} as const;

export async function insertSiteNote(
  firmId: string,
  authorId: string,
  input: SiteNoteInput
): Promise<SiteNoteRow> {
  const now = new Date();
  const [row] = await db
    .insert(siteNotes)
    .values({
      firmId,
      authorId,
      projectId: input.projectId,
      localId: input.localId,
      noteType: input.noteType ?? 'personal',
      approvalStatus: input.noteType === 'approval_request' ? 'pending' : null,
      noteText: input.noteText ?? null,
      photoUrl: input.photoUrl ?? null,
      photoLocalKey: input.photoLocalKey ?? null,
      latitude: input.latitude != null ? String(input.latitude) : null,
      longitude: input.longitude != null ? String(input.longitude) : null,
      capturedAt: new Date(input.capturedAt),
      syncedAt: now,
    })
    .returning();

  return row;
}


export async function findNoteByLocalId(
  firmId: string,
  localId: string
): Promise<SiteNoteRow | null> {
  const [row] = await db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .where(and(eq(siteNotes.firmId, firmId), eq(siteNotes.localId, localId)))
    .limit(1);

  return row ?? null;
}

export async function softDeleteSiteNote(id: string, firmId: string): Promise<boolean> {
  const result = await db
    .update(siteNotes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(siteNotes.id, id), eq(siteNotes.firmId, firmId), isNull(siteNotes.deletedAt)));
  return (result.rowCount ?? 0) > 0;
}

export async function markWhatsappSent(id: string): Promise<void> {
  await db
    .update(siteNotes)
    .set({ whatsappSent: true, updatedAt: new Date() })
    .where(eq(siteNotes.id, id));
}

export async function updateNoteApprovalStatus(
  id: string,
  firmId: string,
  status: 'approved' | 'rejected',
  clientResponseText?: string | null,
): Promise<boolean> {
  const setValues: Record<string, unknown> = { approvalStatus: status, updatedAt: new Date() };
  if (clientResponseText != null) setValues.clientResponseText = clientResponseText;
  const result = await db
    .update(siteNotes)
    .set(setValues)
    .where(
      and(
        eq(siteNotes.id, id),
        eq(siteNotes.firmId, firmId),
        eq(siteNotes.noteType, 'approval_request'),
        isNull(siteNotes.deletedAt)
      )
    );
  return (result.rowCount ?? 0) > 0;
}

export async function listSiteNotes(
  firmId: string,
  projectId: string | undefined,
  limit: number,
  cursor?: string,
  noteType?: NoteType
): Promise<SiteNoteRow[]> {
  const conditions = [
    eq(siteNotes.firmId, firmId),
    isNull(siteNotes.deletedAt),
  ];

  if (projectId) conditions.push(eq(siteNotes.projectId, projectId));
  if (noteType) conditions.push(eq(siteNotes.noteType, noteType));
  if (cursor) conditions.push(lt(siteNotes.capturedAt, new Date(cursor)));

  return db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .where(and(...conditions))
    .orderBy(desc(siteNotes.capturedAt))
    .limit(limit);
}

export async function findSiteNoteById(
  id: string,
  firmId: string
): Promise<SiteNoteRow | null> {
  const [row] = await db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .where(and(eq(siteNotes.id, id), eq(siteNotes.firmId, firmId), isNull(siteNotes.deletedAt)))
    .limit(1);

  return row ?? null;
}

export async function listDeletedNotes(firmId: string): Promise<SiteNoteRow[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .where(
      and(
        eq(siteNotes.firmId, firmId),
        isNotNull(siteNotes.deletedAt),
        gt(siteNotes.deletedAt, thirtyDaysAgo),
      )
    )
    .orderBy(desc(siteNotes.deletedAt));
}

export async function restoreSiteNote(id: string, firmId: string): Promise<boolean> {
  const result = await db
    .update(siteNotes)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(siteNotes.id, id), eq(siteNotes.firmId, firmId), isNotNull(siteNotes.deletedAt)));
  return (result.rowCount ?? 0) > 0;
}

export async function findPhotosReadyForDeletion(firmId: string): Promise<{ id: string; photoUrl: string }[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return db
    .select({ id: siteNotes.id, photoUrl: siteNotes.photoUrl })
    .from(siteNotes)
    .where(
      and(
        eq(siteNotes.firmId, firmId),
        isNotNull(siteNotes.deletedAt),
        lte(siteNotes.deletedAt, thirtyDaysAgo),
        isNotNull(siteNotes.photoUrl),
      )
    ) as Promise<{ id: string; photoUrl: string }[]>;
}

export async function clearPhotoUrl(id: string): Promise<void> {
  await db
    .update(siteNotes)
    .set({ photoUrl: null, updatedAt: new Date() })
    .where(eq(siteNotes.id, id));
}

// Returns project + client phone — used for WhatsApp on site_visit and approval_request
export async function findProjectWithClientForNote(
  projectId: string,
  firmId: string
): Promise<{ id: string; name: string; clientPhone: string; clientName: string } | null> {
  const [row] = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientPhone: clients.phone,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, projectId), eq(projects.firmId, firmId), isNull(projects.deletedAt)))
    .limit(1);

  return row ?? null;
}

// Find most recent pending approval_request for a client phone — used by incoming WhatsApp webhook.
// Tries all 4 common Indian phone formats. Falls back to most-recent pending approval
// when phone can't be matched (e.g. WhatsApp @lid privacy JIDs).
export async function findPendingApprovalByClientPhone(
  phone: string
): Promise<SiteNoteRow | null> {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const possibleFormats = ['+91' + last10, '91' + last10, last10, '0' + last10];

  const [byPhone] = await db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .innerJoin(projects, eq(siteNotes.projectId, projects.id))
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(
      and(
        eq(siteNotes.noteType, 'approval_request'),
        eq(siteNotes.approvalStatus, 'pending'),
        isNull(siteNotes.deletedAt),
        inArray(clients.phone, possibleFormats)
      )
    )
    .orderBy(desc(siteNotes.capturedAt))
    .limit(1);

  if (byPhone) return byPhone;

  // WhatsApp @lid JIDs don't expose the phone number — fall back to the most recent
  // pending approval across all clients (safe for single-firm pilot).
  const [byRecent] = await db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .where(
      and(
        eq(siteNotes.noteType, 'approval_request'),
        eq(siteNotes.approvalStatus, 'pending'),
        isNull(siteNotes.deletedAt),
      )
    )
    .orderBy(desc(siteNotes.capturedAt))
    .limit(1);

  return byRecent ?? null;
}

// Legacy — used by personal note path (no client needed)
export async function findProjectForNote(
  projectId: string,
  firmId: string
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.firmId, firmId), isNull(projects.deletedAt)))
    .limit(1);

  return row ?? null;
}
