'use client';

import { getPendingNotes, markNoteSynced, markNoteSyncError, getOfflineDB } from './db';

export async function syncPendingNotes(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingNotes();
  let synced = 0;
  let failed = 0;

  for (const note of pending) {
    try {
      let photoUrl: string | null = null;

      if (note.photoLocalKey) {
        const db = await getOfflineDB();
        const photo = await db.get('photos', note.photoLocalKey);
        if (photo) {
          // Get presigned upload URL
          const presignRes = await fetch('/api/v1/site-notes/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mimeType: photo.mimeType }),
          });
          if (presignRes.ok) {
            const { uploadUrl, publicUrl } = await presignRes.json();
            await fetch(uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': photo.mimeType },
              body: photo.blob,
            });
            photoUrl = publicUrl;
          }
        }
      }

      const res = await fetch('/api/v1/site-notes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          localId: note.localId,
          projectId: note.projectId,
          noteText: note.noteText,
          photoUrl,
          photoLocalKey: note.photoLocalKey,
          latitude: note.latitude,
          longitude: note.longitude,
          capturedAt: note.capturedAt,
        }]),
      });

      if (res.ok) {
        const { data } = await res.json();
        await markNoteSynced(note.localId, data[0]?.id ?? note.localId);
        synced++;
      } else {
        await markNoteSyncError(note.localId, `HTTP ${res.status}`);
        failed++;
      }
    } catch (err) {
      await markNoteSyncError(note.localId, String(err));
      failed++;
    }
  }

  return { synced, failed };
}
