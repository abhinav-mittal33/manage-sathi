import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ManageSathiDB extends DBSchema {
  'site-notes': {
    key: string;
    value: {
      localId: string;
      projectId: string;
      firmId: string;
      authorId: string;
      noteType?: 'site_visit' | 'personal' | 'approval_request';
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
      key: string;
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
    dbPromise = openDB<ManageSathiDB>('manage-sathi-offline', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const noteStore = db.createObjectStore('site-notes', { keyPath: 'localId' });
          noteStore.createIndex('by-project', 'projectId');
          noteStore.createIndex('by-sync-status', 'syncStatus');

          db.createObjectStore('photos', { keyPath: 'key' });

          const queueStore = db.createObjectStore('sync-queue', { autoIncrement: true });
          queueStore.createIndex('by-entity', 'entityLocalId');
        }
        // v2: noteType field added — no structural change, old records read as noteType=undefined → treated as 'personal'
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
  await db.put('photos', { key, blob, mimeType, capturedAt: new Date().toISOString() });
}

export async function getPendingNotes(): Promise<ManageSathiDB['site-notes']['value'][]> {
  const db = await getOfflineDB();
  return db.getAllFromIndex('site-notes', 'by-sync-status', 'pending');
}

export async function getUnsyncedNotes(): Promise<ManageSathiDB['site-notes']['value'][]> {
  const db = await getOfflineDB();
  const [pending, errored] = await Promise.all([
    db.getAllFromIndex('site-notes', 'by-sync-status', 'pending'),
    db.getAllFromIndex('site-notes', 'by-sync-status', 'error'),
  ]);
  return [...pending, ...errored];
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

export async function deleteNoteFromIDB(localId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('site-notes', localId);
}

export async function getPendingCount(): Promise<number> {
  const db = await getOfflineDB();
  return db.countFromIndex('site-notes', 'by-sync-status', 'pending');
}
