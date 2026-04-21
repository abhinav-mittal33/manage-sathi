import {
  insertSiteNote,
  insertSiteNoteFromSync,
  findNoteByLocalId,
  findSiteNoteById,
  findProjectForNote,
  listSiteNotes,
  type SiteNoteRow,
} from '@/lib/dal/site-note.dal';
import { sendSiteNoteNotification } from '@/lib/whatsapp';
import type { SiteNoteInput } from '@/lib/validations/site-note';

export type { SiteNoteRow };

export interface SyncResultItem {
  localId: string;
  status: 'synced' | 'skipped' | 'failed';
  id?: string;
  error?: string;
}

export interface SyncResult {
  synced: number;
  skipped: number;
  failed: number;
  results: SyncResultItem[];
}

// ─── Online creation path ────────────────────────────────────────────────────

export async function createNote(
  firmId: string,
  userId: string,
  input: SiteNoteInput
): Promise<SiteNoteRow> {
  const note = await insertSiteNote(firmId, userId, input);

  // Dispatch WhatsApp notification — failure must never fail the main request
  try {
    const project = await findProjectForNote(input.projectId, firmId);
    if (project) {
      await sendSiteNoteNotification(
        {
          id: note.id,
          noteText: note.noteText,
          photoUrl: note.photoUrl,
          capturedAt: note.capturedAt,
          latitude: note.latitude,
          longitude: note.longitude,
        },
        project,
        userId
      );
    }
  } catch (err) {
    console.error('[SiteNoteService] WhatsApp notification failed for note', note.id, err);
  }

  return note;
}

// ─── Offline sync path ───────────────────────────────────────────────────────

export async function syncNotes(
  firmId: string,
  userId: string,
  notes: SiteNoteInput[]
): Promise<SyncResult> {
  const results: SyncResultItem[] = [];
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const input of notes) {
    try {
      // Idempotency check: if (firmId, localId) already exists → skip
      const existing = await findNoteByLocalId(firmId, input.localId);
      if (existing) {
        skipped++;
        results.push({ localId: input.localId, status: 'skipped', id: existing.id });
        continue;
      }

      const note = await insertSiteNoteFromSync(firmId, userId, input);
      synced++;
      results.push({ localId: input.localId, status: 'synced', id: note.id });

      // WhatsApp per-note — failure must never abort the rest of the batch
      try {
        const project = await findProjectForNote(input.projectId, firmId);
        if (project) {
          await sendSiteNoteNotification(
            {
              id: note.id,
              noteText: note.noteText,
              photoUrl: note.photoUrl,
              capturedAt: note.capturedAt,
              latitude: note.latitude,
              longitude: note.longitude,
            },
            project,
            userId
          );
        }
      } catch (waErr) {
        console.error('[SiteNoteService] WhatsApp notification failed for note', note.id, waErr);
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SiteNoteService] Sync failed for localId', input.localId, err);
      results.push({ localId: input.localId, status: 'failed', error: message });
    }
  }

  return { synced, skipped, failed, results };
}

// ─── List / Get ──────────────────────────────────────────────────────────────

export async function listNotes(
  firmId: string,
  filters: { projectId: string; limit: number; cursor?: string }
): Promise<{ notes: SiteNoteRow[]; nextCursor: string | null }> {
  const rows = await listSiteNotes(firmId, filters.projectId, filters.limit, filters.cursor);

  // If we got exactly `limit` rows there may be more — expose the last capturedAt as cursor
  const nextCursor =
    rows.length === filters.limit
      ? rows[rows.length - 1].capturedAt.toISOString()
      : null;

  return { notes: rows, nextCursor };
}

export async function getNote(id: string, firmId: string): Promise<SiteNoteRow | null> {
  return findSiteNoteById(id, firmId);
}
