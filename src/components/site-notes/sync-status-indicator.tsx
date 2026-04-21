'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { getPendingCount } from '@/lib/offline/db';
import { syncPendingNotes } from '@/lib/offline/sync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function SyncStatusIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IDB may not be available in SSR edge — silently ignore
    }
  }, []);

  useEffect(() => {
    refreshCount();

    function handleOnline() {
      refreshCount();
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refreshCount]);

  async function handleSync() {
    setSyncing(true);
    try {
      await syncPendingNotes();
      await refreshCount();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 3000);
    } catch {
      // sync errors are handled inside syncPendingNotes; just refresh count
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }

  if (pendingCount === 0 && !justSynced) return null;

  if (justSynced && pendingCount === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-sage">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>All notes synced</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-sand/30 border border-sand px-3 py-2">
      <Badge
        variant="secondary"
        className="bg-sand text-charcoal shrink-0"
      >
        {pendingCount} {pendingCount === 1 ? 'note' : 'notes'} pending sync
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className="text-charcoal hover:text-sage h-7 px-2"
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </div>
  );
}
