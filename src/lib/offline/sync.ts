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
          const formData = new FormData();
          formData.append('photo', new File([photo.blob], 'photo.jpg', { type: photo.mimeType }));
          const uploadRes = await fetch('/api/v1/site-notes/upload-photo', {
            method: 'POST',
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            photoUrl = uploadData.data?.fileUrl ?? null;
          }
        }
      }

      const payload: Record<string, unknown> = {
        localId: note.localId,
        projectId: note.projectId,
        capturedAt: note.capturedAt,
      };
      if (note.noteText) payload.noteText = note.noteText;
      if (photoUrl) payload.photoUrl = photoUrl;
      if (note.photoLocalKey) payload.photoLocalKey = note.photoLocalKey;
      if (note.latitude != null) payload.latitude = note.latitude;
      if (note.longitude != null) payload.longitude = note.longitude;

      const res = await fetch('/api/v1/site-notes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([payload]),
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
