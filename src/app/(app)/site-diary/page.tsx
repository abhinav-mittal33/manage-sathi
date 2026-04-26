'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Loader2, BookOpen, Trash2, CheckSquare, X, RotateCcw, Trash, Camera, Lock, MessageSquareDiff } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SyncStatusIndicator } from '@/components/site-notes/sync-status-indicator';
import { NoteCard, type NoteDisplay } from '@/components/site-notes/note-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUnsyncedNotes, deleteNoteFromIDB } from '@/lib/offline/db';

type NoteType = 'site_visit' | 'personal' | 'approval_request';
type ActiveTab = 'all' | NoteType;
type Tab = ActiveTab | 'deleted';

interface ApiNote {
  id: string;
  localId: string;
  noteType?: NoteType;
  approvalStatus?: string | null;
  clientResponseText?: string | null;
  noteText: string | null;
  photoUrl: string | null;
  capturedAt: string;
  deletedAt?: string | null;
  project?: { id: string; name: string };
}

interface ApiResponse {
  success: boolean;
  data: { notes: ApiNote[]; nextCursor: string | null; limit: number };
}

const PAGE_SIZE = 20;

const TAB_CONFIG: { id: Tab; label: string; icon?: React.ElementType }[] = [
  { id: 'all',              label: 'All' },
  { id: 'site_visit',       label: 'Site Visits',  icon: Camera },
  { id: 'personal',         label: 'My Notes',     icon: Lock },
  { id: 'approval_request', label: 'Approvals',    icon: MessageSquareDiff },
  { id: 'deleted',          label: 'Deleted',      icon: Trash },
];

export default function SiteDiaryPage() {
  const [tab, setTab] = useState<Tab>('all');

  const [notes, setNotes] = useState<NoteDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [deletedNotes, setDeletedNotes] = useState<ApiNote[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [deletedError, setDeletedError] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const isActiveTab = tab !== 'deleted';

  const fetchPage = useCallback(async (noteType: ActiveTab, cursor?: string): Promise<ApiResponse> => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (noteType !== 'all') params.set('noteType', noteType);
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/v1/site-notes?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const loadOfflinePending = useCallback(async (): Promise<NoteDisplay[]> => {
    try {
      const unsynced = await getUnsyncedNotes();
      return unsynced.map((n) => ({
        localId: n.localId,
        noteType: n.noteType ?? 'personal',
        noteText: n.noteText,
        photoUrl: null,
        capturedAt: n.capturedAt,
        syncStatus: n.syncStatus as NoteDisplay['syncStatus'],
      }));
    } catch { return []; }
  }, []);

  const loadNotes = useCallback(async (activeTab: ActiveTab) => {
    setLoading(true);
    setError(null);
    try {
      const [offlineNotes, serverData] = await Promise.all([
        activeTab === 'all' ? loadOfflinePending() : Promise.resolve([]),
        fetchPage(activeTab),
      ]);
      const serverNotes = serverData.data.notes;
      const serverLocalIds = new Set(serverNotes.map((n) => n.localId));
      const uniqueOffline = offlineNotes.filter((n) => !serverLocalIds.has(n.localId));
      const serverDisplayNotes: NoteDisplay[] = serverNotes.map((n) => ({
        id: n.id,
        localId: n.localId,
        noteType: n.noteType ?? 'personal',
        approvalStatus: n.approvalStatus as NoteDisplay['approvalStatus'],
        clientResponseText: n.clientResponseText,
        noteText: n.noteText,
        photoUrl: n.photoUrl,
        capturedAt: n.capturedAt,
        syncStatus: 'synced' as const,
        projectName: n.project?.name,
      }));
      setNotes([...uniqueOffline, ...serverDisplayNotes]);
      setNextCursor(serverData.data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [fetchPage, loadOfflinePending]);

  const loadDeletedNotes = useCallback(async () => {
    setLoadingDeleted(true);
    setDeletedError(null);
    try {
      const res = await fetch('/api/v1/site-notes/deleted');
      const json = await res.json();
      if (json.success) setDeletedNotes(json.data);
      else throw new Error(json.error?.message ?? 'Failed to load');
    } catch (err) {
      setDeletedError(err instanceof Error ? err.message : 'Failed to load deleted notes');
    } finally {
      setLoadingDeleted(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'deleted') { loadDeletedNotes(); return; }
    loadNotes(tab);
  }, [tab, loadNotes, loadDeletedNotes]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore || tab === 'deleted') return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(tab as ActiveTab, nextCursor);
      const more: NoteDisplay[] = data.data.notes.map((n) => ({
        id: n.id, localId: n.localId,
        noteType: n.noteType ?? 'personal',
        approvalStatus: n.approvalStatus as NoteDisplay['approvalStatus'],
        clientResponseText: n.clientResponseText,
        noteText: n.noteText, photoUrl: n.photoUrl,
        capturedAt: n.capturedAt, syncStatus: 'synced' as const,
        projectName: n.project?.name,
      }));
      setNotes((prev) => [...prev, ...more]);
      setNextCursor(data.data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally { setLoadingMore(false); }
  }

  function handleToggleSelect(localId: string, checked: boolean) {
    setSelectedIds((prev) => { const next = new Set(prev); if (checked) next.add(localId); else next.delete(localId); return next; });
  }

  function exitSelectionMode() { setSelectionMode(false); setSelectedIds(new Set()); }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} note${selectedIds.size > 1 ? 's' : ''}? They'll be in Deleted for 30 days.`)) return;
    setDeleting(true);
    try {
      const toDelete = notes.filter((n) => selectedIds.has(n.localId));
      await Promise.all([
        ...toDelete.filter((n) => n.id).map((n) => fetch(`/api/v1/site-notes/${n.id}`, { method: 'DELETE' })),
        ...toDelete.filter((n) => !n.id).map((n) => deleteNoteFromIDB(n.localId)),
      ]);
      exitSelectionMode();
      if (tab !== 'deleted') await loadNotes(tab as ActiveTab);
    } catch { setError('Failed to delete some notes.'); }
    finally { setDeleting(false); }
  }

  async function handleRestore(id: string) {
    await fetch(`/api/v1/site-notes/${id}`, { method: 'PATCH' });
    await Promise.all([loadDeletedNotes(), loadNotes('all')]);
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm('Permanently delete this note? This cannot be undone.')) return;
    await fetch(`/api/v1/site-notes/${id}`, { method: 'DELETE' });
    await loadDeletedNotes();
  }

  const allSelected = notes.length > 0 && selectedIds.size === notes.length;

  return (
    <>
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2" onClick={() => setLightboxUrl(null)} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image src={lightboxUrl} alt="Site photo full view" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}

      <div className="space-y-6">
        <PageHeader
          title="Site Diary"
          description="All site notes across your projects"
          actions={
            <div className="flex items-center gap-2">
              {isActiveTab && !selectionMode && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setSelectionMode(true)} className="gap-1.5 border-sand text-charcoal">
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select
                  </Button>
                  <Link href="/site-diary/new">
                    <Button size="sm" className="bg-sage hover:bg-sage/90 text-white gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Add Note
                    </Button>
                  </Link>
                </>
              )}
              {isActiveTab && selectionMode && (
                <>
                  <button onClick={() => setSelectedIds(allSelected ? new Set() : new Set(notes.map((n) => n.localId)))} className="text-sm text-sage font-medium hover:underline">
                    {allSelected ? 'Deselect all' : 'Select all'}
                  </button>
                  <Button size="sm" variant="destructive" disabled={selectedIds.size === 0 || deleting} onClick={handleDeleteSelected} className="gap-1.5">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                  </Button>
                  <Button size="sm" variant="outline" onClick={exitSelectionMode} className="gap-1.5 border-sand">
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-border scrollbar-none">
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (selectionMode) exitSelectionMode(); }}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === id
                  ? 'border-sage text-sage'
                  : 'border-transparent text-muted-foreground hover:text-charcoal'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {/* Active notes */}
        {isActiveTab && (
          <>
            <SyncStatusIndicator />
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-4">{error}</p>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <BookOpen className="w-10 h-10 text-sand" />
                <p className="text-sm text-muted-foreground">No notes here yet.</p>
                <Link href="/site-diary/new">
                  <Button size="sm" className="bg-sage hover:bg-sage/90 text-white gap-1.5 mt-1">
                    <Plus className="w-3.5 h-3.5" />
                    Add Note
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <NoteCard
                    key={note.localId}
                    note={note}
                    selected={selectionMode ? selectedIds.has(note.localId) : undefined}
                    onSelect={selectionMode ? handleToggleSelect : undefined}
                    onPhotoClick={setLightboxUrl}
                  />
                ))}
                {nextCursor && (
                  <Button variant="outline" className="w-full border-sand text-charcoal hover:border-sage" onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading…</> : 'Load more'}
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Deleted */}
        {tab === 'deleted' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Notes here are permanently removed after 30 days.</p>
            {loadingDeleted ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
            ) : deletedError ? (
              <p className="text-sm text-destructive">{deletedError}</p>
            ) : deletedNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Trash className="w-10 h-10 text-sand" />
                <p className="text-sm text-muted-foreground">No recently deleted notes.</p>
              </div>
            ) : (
              deletedNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-sand bg-white/70 px-4 py-3 space-y-2 opacity-75">
                  {note.photoUrl && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden">
                      <Image src={note.photoUrl} alt="Site photo" fill className="object-cover grayscale" sizes="640px" />
                    </div>
                  )}
                  {note.noteText && <p className="text-sm text-charcoal">{note.noteText}</p>}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      Deleted {note.deletedAt ? new Date(note.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-sand gap-1" onClick={() => handleRestore(note.id)}>
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handlePermanentDelete(note.id)}>
                        <Trash2 className="w-3 h-3" />
                        Delete forever
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
