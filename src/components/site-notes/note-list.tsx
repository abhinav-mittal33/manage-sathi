'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, StickyNote } from 'lucide-react';
import { NoteCard, type NoteDisplay } from './note-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getPendingNotes } from '@/lib/offline/db';

interface NoteListProps {
  projectId: string;
}

interface ApiNote {
  id: string;
  localId: string;
  noteText: string | null;
  photoUrl: string | null;
  capturedAt: string;
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

export function NoteList({ projectId }: NoteListProps) {
  const [notes, setNotes] = useState<NoteDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({
        projectId,
        limit: String(PAGE_SIZE),
      });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/v1/site-notes?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      return json;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to load notes');
    }
  }, [projectId]);

  const loadOfflinePending = useCallback(async (): Promise<NoteDisplay[]> => {
    try {
      const pending = await getPendingNotes();
      return pending
        .filter((n) => n.projectId === projectId)
        .map((n) => ({
          localId: n.localId,
          noteText: n.noteText,
          photoUrl: null,  // blob is in IDB, not a URL yet
          capturedAt: n.capturedAt,
          syncStatus: n.syncStatus as NoteDisplay['syncStatus'],
        }));
    } catch {
      return [];
    }
  }, [projectId]);

  // Initial load: merge offline pending + first page from server
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [offlineNotes, serverData] = await Promise.all([
          loadOfflinePending(),
          loadNotes(),
        ]);

        if (cancelled) return;

        // Pending IDB notes go on top; deduplicate against server notes by localId
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
        }));

        setNotes([...uniqueOffline, ...serverDisplayNotes]);
        setNextCursor(serverData.data.nextCursor);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load notes');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [loadNotes, loadOfflinePending]);

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await loadNotes(nextCursor);
      const more: NoteDisplay[] = data.data.notes.map((n) => ({
        id: n.id,
        localId: n.localId,
        noteText: n.noteText,
        photoUrl: n.photoUrl,
        capturedAt: n.capturedAt,
        syncStatus: 'synced' as const,
      }));
      setNotes((prev) => [...prev, ...more]);
      setNextCursor(data.data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more notes');
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-4">{error}</p>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <StickyNote className="w-10 h-10 text-sand" />
        <p className="text-sm text-muted-foreground">No site notes yet.</p>
        <p className="text-xs text-muted-foreground">
          Add your first note to start documenting site progress.
        </p>
      </div>
    );
  }

  return (
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
  );
}
