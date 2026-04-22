import { eq, and, isNull, isNotNull, desc, lt, lte, gt } from 'drizzle-orm';
import { db } from '@/db';
import { siteNotes, projects } from '@/db/schema';
import type { SiteNoteInput } from '@/lib/validations/site-note';

export type SiteNoteRow = typeof siteNotes.$inferSelect;

// Columns returned on every list/get — avoids SELECT *
const NOTE_COLUMNS = {
  id: siteNotes.id,
  firmId: siteNotes.firmId,
  projectId: siteNotes.projectId,
  localId: siteNotes.localId,
  authorId: siteNotes.authorId,
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

// Insert a new site note and mark it as synced immediately (server-side creation)
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
      noteText: input.noteText ?? null,
      photoUrl: input.photoUrl ?? null,
      photoLocalKey: input.photoLocalKey ?? null,
      latitude: input.latitude != null ? String(input.latitude) : null,
      longitude: input.longitude != null ? String(input.longitude) : null,
      capturedAt: new Date(input.capturedAt),
      // Online creation: synced immediately
      syncedAt: now,
    })
    .returning();

  return row;
}

// Check if a note already exists for the (firmId, localId) unique constraint
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

// Insert via the offline sync path — marks syncedAt explicitly
export async function insertSiteNoteFromSync(
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

// Soft-delete a note by setting deletedAt (firm-scoped for safety)
export async function softDeleteSiteNote(id: string, firmId: string): Promise<boolean> {
  const result = await db
    .update(siteNotes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(siteNotes.id, id), eq(siteNotes.firmId, firmId), isNull(siteNotes.deletedAt)));
  return (result.rowCount ?? 0) > 0;
}

// Mark whatsapp_sent = true after successful notification dispatch
export async function markWhatsappSent(id: string): Promise<void> {
  await db
    .update(siteNotes)
    .set({ whatsappSent: true, updatedAt: new Date() })
    .where(eq(siteNotes.id, id));
}

// List notes for a project with cursor-based pagination (capturedAt DESC)
export async function listSiteNotes(
  firmId: string,
  projectId: string | undefined,
  limit: number,
  cursor?: string
): Promise<SiteNoteRow[]> {
  const conditions = [
    eq(siteNotes.firmId, firmId),
    isNull(siteNotes.deletedAt),
  ];

  if (projectId) {
    conditions.push(eq(siteNotes.projectId, projectId));
  }

  // Cursor is an ISO timestamp; return notes captured before that moment
  if (cursor) {
    conditions.push(lt(siteNotes.capturedAt, new Date(cursor)));
  }

  return db
    .select(NOTE_COLUMNS)
    .from(siteNotes)
    .where(and(...conditions))
    .orderBy(desc(siteNotes.capturedAt))
    .limit(limit);
}

// Fetch a single note, verifying firm ownership
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

// Notes soft-deleted within the last 30 days (recoverable trash)
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

// Restore a soft-deleted note (clear deletedAt)
export async function restoreSiteNote(id: string, firmId: string): Promise<boolean> {
  const result = await db
    .update(siteNotes)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(siteNotes.id, id), eq(siteNotes.firmId, firmId), isNotNull(siteNotes.deletedAt)));
  return (result.rowCount ?? 0) > 0;
}

// Notes soft-deleted >30 days ago that still have a photoUrl — ready for R2 cleanup
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

// Clear photoUrl after R2 object is deleted (marks cleanup complete)
export async function clearPhotoUrl(id: string): Promise<void> {
  await db
    .update(siteNotes)
    .set({ photoUrl: null, updatedAt: new Date() })
    .where(eq(siteNotes.id, id));
}

// Fetch the project row needed for WhatsApp notification — only id + name
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
