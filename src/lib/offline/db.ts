import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ManageSathiDB extends DBSchema {
  'site-notes': {
    key: string;
    value: {
      localId: string;
      projectId: string;
      firmId: string;
      authorId: string;
      noteText: string | null;
      photoLocalKey: string | null;
      latitude: number | null;
      longitude: number | null;
      capturedAt: string;
      syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
      syncError: string | null;
      serverId: string | null;
    };
    indexes: {
      'by-project': string;
      'by-sync-status': string;
    };
  };
  'photos': {
    key: string;
    value: {
      blob: Blob;
      mimeType: string;
      capturedAt: string;
    };
  };
  'sync-queue': {
    key: number;
    value: {
      entityType: 'site-note';
      entityLocalId: string;
      action: 'create';
      attempts: number;
      lastAttempt: string | null;
      error: string | null;
    };
    indexes: {
      'by-entity': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<ManageSathiDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<ManageSathiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ManageSathiDB>('manage-sathi-offline', 1, {
      upgrade(db) {
        const noteStore = db.createObjectStore('site-notes', { keyPath: 'localId' });
        noteStore.createIndex('by-project', 'projectId');
        noteStore.createIndex('by-sync-status', 'syncStatus');

        db.createObjectStore('photos', { keyPath: 'key' });

        const queueStore = db.createObjectStore('sync-queue', { autoIncrement: true });
        queueStore.createIndex('by-entity', 'entityLocalId');
      },
    });
  }
  return dbPromise;
}

export async function saveSiteNoteOffline(
  note: ManageSathiDB['site-notes']['value']
): Promise<void> {
  const db = await getOfflineDB();
  await db.put('site-notes', note);
  const tx = db.transaction('sync-queue', 'readwrite');
  await tx.store.add({
    entityType: 'site-note',
    entityLocalId: note.localId,
    action: 'create',
    attempts: 0,
    lastAttempt: null,
    error: null,
  });
  await tx.done;
}

export async function savePhotoOffline(
  key: string,
  blob: Blob,
  mimeType: string
): Promise<void> {
  const db = await getOfflineDB();
  await db.put('photos', { blob, mimeType, capturedAt: new Date().toISOString() } as ManageSathiDB['photos']['value'] & { key: string });
}

export async function getPendingNotes(): Promise<ManageSathiDB['site-notes']['value'][]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('site-notes', 'by-sync-status', 'pending');
}

export async function markNoteSynced(localId: string, serverId: string): Promise<void> {
  const db = await getOfflineDB();
  const note = await db.get('site-notes', localId);
  if (note) {
    note.syncStatus = 'synced';
    note.serverId = serverId;
    await db.put('site-notes', note);
  }
}

export async function markNoteSyncError(localId: string, error: string): Promise<void> {
  const db = await getOfflineDB();
  const note = await db.get('site-notes', localId);
  if (note) {
    note.syncStatus = 'error';
    note.syncError = error;
    await db.put('site-notes', note);
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getOfflineDB();
  return db.countFromIndex('site-notes', 'by-sync-status', 'pending');
}
