'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CameraButton } from './camera-button';
import { saveSiteNoteOffline, savePhotoOffline } from '@/lib/offline/db';
import { syncPendingNotes } from '@/lib/offline/sync';
import { generateLocalId } from '@/lib/utils';

interface NoteCaptureFormProps {
  projectId: string;
  onSuccess: () => void;
}

type GpsState = 'idle' | 'acquiring' | 'acquired' | 'unavailable';

export function NoteCaptureForm({ projectId, onSuccess }: NoteCaptureFormProps) {
  const [noteText, setNoteText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Auto-acquire GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState('unavailable');
      return;
    }
    setGpsState('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsState('acquired');
      },
      () => setGpsState('unavailable'),
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  // Cleanup object URL when component unmounts or photo changes
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function handleCapture(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPhotoFile(file);
    setPhotoPreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!noteText.trim() && !photoFile) {
      setError('Add a note or photo before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const localId = generateLocalId();

      // Save photo blob to IndexedDB first (offline-safe)
      if (photoFile) {
        const blob = new Blob([await photoFile.arrayBuffer()], { type: photoFile.type });
        await savePhotoOffline(localId, blob, photoFile.type);
      }

      // Save note to IndexedDB — firmId and authorId are filled server-side on sync
      await saveSiteNoteOffline({
        localId,
        projectId,
        firmId: '',   // placeholder; server reads from JWT on sync
        authorId: '', // placeholder; server reads from JWT on sync
        noteText: noteText.trim() || null,
        photoLocalKey: photoFile ? localId : null,
        latitude,
        longitude,
        capturedAt: new Date().toISOString(),
        syncStatus: 'pending',
        syncError: null,
        serverId: null,
      });

      // Best-effort online sync — failure is silent, note stays queued
      try {
        await syncPendingNotes();
      } catch {
        // Network down — note will sync later via SyncStatusIndicator
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const gpsLabel: Record<GpsState, string> = {
    idle: '',
    acquiring: 'Acquiring GPS…',
    acquired: `GPS: ${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`,
    unavailable: 'GPS unavailable',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Photo */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-charcoal">Photo (optional)</label>
        <CameraButton onCapture={handleCapture} preview={photoPreview} />
      </div>

      {/* Note text */}
      <div className="space-y-1.5">
        <label htmlFor="note-text" className="text-sm font-medium text-charcoal">
          Note
        </label>
        <Textarea
          id="note-text"
          placeholder="Describe what you observed on site…"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={4}
          className="resize-none border-sand focus-visible:border-sage"
        />
      </div>

      {/* GPS status */}
      <div className="flex items-center gap-1.5 text-xs">
        {gpsState === 'acquiring' && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">{gpsLabel.acquiring}</span>
          </>
        )}
        {gpsState === 'acquired' && (
          <>
            <MapPin className="w-3.5 h-3.5 text-sage" />
            <span className="text-sage">{gpsLabel.acquired}</span>
          </>
        )}
        {gpsState === 'unavailable' && (
          <>
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{gpsLabel.unavailable}</span>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-sage hover:bg-sage/90 text-white"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save Note
          </>
        )}
      </Button>
    </form>
  );
}
