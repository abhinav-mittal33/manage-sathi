'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SyncStatusIndicator } from '@/components/site-notes/sync-status-indicator';
import { NoteCard, type NoteDisplay } from '@/components/site-notes/note-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getPendingNotes } from '@/lib/offline/db';

interface ApiNote {
  id: string;
  localId: string;
  noteText: string | null;
  photoUrl: string | null;
  capturedAt: string;
  project?: { id: string; name: string };
}

interface ApiResponse {
  success: boolean;
  data: {
    notes: ApiNote[];
    nextCursor: string | null;
    limit: number;
  };
}

const PAGE_SIZE = 20;

export default function SiteDiaryPage() {
  const [notes, setNotes] = useState<NoteDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (cursor?: string): Promise<ApiResponse> => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/v1/site-notes?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const loadOfflinePending = useCallback(async (): Promise<NoteDisplay[]> => {
    try {
      const pending = await getPendingNotes();
      return pending.map((n) => ({
        localId: n.localId,
        noteText: n.noteText,
        photoUrl: null,
        capturedAt: n.capturedAt,
        syncStatus: n.syncStatus as NoteDisplay['syncStatus'],
      }));
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [offlineNotes, serverData] = await Promise.all([
          loadOfflinePending(),
          fetchPage(),
        ]);

        if (cancelled) return;

        const serverNotes = serverData.data.notes;
        const serverLocalIds = new Set(serverNotes.map((n) => n.localId));
        const uniqueOffline = offlineNotes.filter((n) => !serverLocalIds.has(n.localId));

        const serverDisplayNotes: NoteDisplay[] = serverNotes.map((n) => ({
          id: n.id,
          localId: n.localId,
          noteText: n.noteText,
          photoUrl: n.photoUrl,
          capturedAt: n.capturedAt,
          syncStatus: 'synced' as const,
          projectName: n.project?.name,
        }));

        setNotes([...uniqueOffline, ...serverDisplayNotes]);
        setNextCursor(serverData.data.nextCursor);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load site diary');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [fetchPage, loadOfflinePending]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextCursor);
      const more: NoteDisplay[] = data.data.notes.map((n) => ({
        id: n.id,
        localId: n.localId,
        noteText: n.noteText,
        photoUrl: n.photoUrl,
        capturedAt: n.capturedAt,
        syncStatus: 'synced' as const,
        projectName: n.project?.name,
      }));
      setNotes((prev) => [...prev, ...more]);
      setNextCursor(data.data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more notes');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Diary"
        description="All site notes across your projects"
        actions={
          <Link href="/site-diary/new">
            <Button size="sm" className="bg-sage hover:bg-sage/90 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </Button>
          </Link>
        }
      />

      <SyncStatusIndicator />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive py-4">{error}</p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpen className="w-10 h-10 text-sand" />
          <p className="text-sm text-muted-foreground">No site notes yet.</p>
          <p className="text-xs text-muted-foreground">
            Start capturing notes on site to build your project diary.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.localId} note={note} />
          ))}

          {nextCursor && (
            <Button
              variant="outline"
              className="w-full border-sand text-charcoal hover:border-sage"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading…
                </>
              ) : (
                'Load more'
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
