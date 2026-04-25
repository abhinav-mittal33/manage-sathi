'use client';

import { getPendingNotes, markNoteSynced, markNoteSyncError, getOfflineDB } from './db';

async function compressPhotoToBase64(blob: Blob): Promise<{ data: string; mimeType: string }> {
  const bitmap = await createImageBitmap(blob);
  const MAX_DIM = 1200;
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale)
  );
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const compressedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
  const arrayBuffer = await compressedBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return { data: btoa(binary), mimeType: 'image/jpeg' };
}

export async function syncPendingNotes(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingNotes();
  let synced = 0;
  let failed = 0;

  for (const note of pending) {
    try {
      let photoUrl: string | null = null;
      let photoBase64: string | null = null;
      let photoMimeType: string | null = null;

      if (note.photoLocalKey) {
        const db = await getOfflineDB();
        const photo = await db.get('photos', note.photoLocalKey);
        if (photo) {
          // Try R2 upload first
          try {
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
          } catch {
            // R2 not configured — fall through to base64
          }

          // Fallback: compress and encode as base64 for WAHA direct send
          if (!photoUrl) {
            try {
              const compressed = await compressPhotoToBase64(photo.blob);
              photoBase64 = compressed.data;
              photoMimeType = compressed.mimeType;
            } catch (e) {
              console.warn('[Sync] Photo compression failed:', e);
            }
          }
        }
      }

      const payload: Record<string, unknown> = {
        localId: note.localId,
        projectId: note.projectId,
        capturedAt: note.capturedAt,
        noteType: note.noteType ?? 'personal',
      };
      if (note.noteText) payload.noteText = note.noteText;
      if (photoUrl) payload.photoUrl = photoUrl;
      if (note.photoLocalKey) payload.photoLocalKey = note.photoLocalKey;
      if (photoBase64) payload.photoBase64 = photoBase64;
      if (photoMimeType) payload.photoMimeType = photoMimeType;
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
