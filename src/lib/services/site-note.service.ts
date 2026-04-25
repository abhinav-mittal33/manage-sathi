import {
  insertSiteNote,
  insertSiteNoteFromSync,
  findNoteByLocalId,
  findSiteNoteById,
  findProjectForNote,
  findProjectWithClientForNote,
  listSiteNotes,
  type SiteNoteRow,
} from '@/lib/dal/site-note.dal';
import {
  sendSiteNoteNotification,
  sendSiteVisitConfirmation,
  sendApprovalRequest,
} from '@/lib/whatsapp';
import type { SiteNoteInput, NoteType } from '@/lib/validations/site-note';

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

async function dispatchWhatsApp(note: SiteNoteRow, input: SiteNoteInput, firmId: string): Promise<void> {
  const noteType = input.noteType ?? 'personal';

  if (noteType === 'personal') return;

  if (noteType === 'site_visit' || noteType === 'approval_request') {
    const projectWithClient = await findProjectWithClientForNote(input.projectId, firmId);
    if (!projectWithClient) return;

    const client = { name: projectWithClient.clientName, phone: projectWithClient.clientPhone };
    const project = { id: projectWithClient.id, name: projectWithClient.name };

    if (noteType === 'site_visit') {
      await sendSiteVisitConfirmation(
        {
          id: note.id,
          noteText: note.noteText,
          photoUrl: note.photoUrl,
          photoBase64: input.photoBase64 ?? null,
          photoMimeType: input.photoMimeType ?? null,
          capturedAt: note.capturedAt,
          latitude: note.latitude,
          longitude: note.longitude,
        },
        project,
        client
      );
    } else {
      await sendApprovalRequest(
        {
          id: note.id,
          noteText: note.noteText,
          photoUrl: note.photoUrl,
          photoBase64: input.photoBase64 ?? null,
          photoMimeType: input.photoMimeType ?? null,
          capturedAt: note.capturedAt,
        },
        project,
        client
      );
    }
  }
}

// ─── Online creation path ────────────────────────────────────────────────────

export async function createNote(
  firmId: string,
  userId: string,
  input: SiteNoteInput
): Promise<SiteNoteRow> {
  const note = await insertSiteNote(firmId, userId, input);

  try {
    await dispatchWhatsApp(note, input, firmId);
  } catch (err) {
    console.error('[SiteNoteService] WhatsApp dispatch failed for note', note.id, err);
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
      const existing = await findNoteByLocalId(firmId, input.localId);
      if (existing) {
        skipped++;
        results.push({ localId: input.localId, status: 'skipped', id: existing.id });
        continue;
      }

      const note = await insertSiteNoteFromSync(firmId, userId, input);
      synced++;
      results.push({ localId: input.localId, status: 'synced', id: note.id });

      try {
        await dispatchWhatsApp(note, input, firmId);
      } catch (waErr) {
        console.error('[SiteNoteService] WhatsApp dispatch failed for note', note.id, waErr);
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
  filters: { projectId?: string; limit: number; cursor?: string; noteType?: NoteType }
): Promise<{ notes: SiteNoteRow[]; nextCursor: string | null }> {
  const rows = await listSiteNotes(firmId, filters.projectId, filters.limit, filters.cursor, filters.noteType);

  const nextCursor =
    rows.length === filters.limit
      ? rows[rows.length - 1].capturedAt.toISOString()
      : null;

  return { notes: rows, nextCursor };
}

export async function getNote(id: string, firmId: string): Promise<SiteNoteRow | null> {
  return findSiteNoteById(id, firmId);
}
