'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, AlertCircle, CheckCircle2, Lock, Camera, MessageSquareDiff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CameraButton } from './camera-button';
import { saveSiteNoteOffline, savePhotoOffline } from '@/lib/offline/db';
import { syncPendingNotes } from '@/lib/offline/sync';
import { generateLocalId } from '@/lib/utils';

type NoteType = 'site_visit' | 'personal' | 'approval_request';
type GpsState = 'idle' | 'acquiring' | 'acquired' | 'unavailable';

interface NoteCaptureFormProps {
  projectId: string;
  onSuccess: () => void;
}

const TYPE_CONFIG = {
  site_visit: {
    icon: Camera,
    label: 'Site Visit',
    sublabel: 'Photo proof with client',
    hint: 'Sent to client as confirmation',
    hintColor: 'text-sage',
    textPlaceholder: 'Describe what was agreed or observed during this visit…',
    textRequired: false,
    photoLabel: 'Photo *',
  },
  personal: {
    icon: Lock,
    label: 'My Note',
    sublabel: 'Private observation',
    hint: 'Visible only to your team',
    hintColor: 'text-muted-foreground',
    textPlaceholder: 'Your private observation, measurement, or reminder…',
    textRequired: true,
    photoLabel: 'Photo (optional)',
  },
  approval_request: {
    icon: MessageSquareDiff,
    label: 'Get Approval',
    sublabel: 'Request from client',
    hint: 'Client will approve or reject',
    hintColor: 'text-amber-600',
    textPlaceholder: 'Describe the change or suggestion you need the client to approve…',
    textRequired: true,
    photoLabel: 'Photo (optional)',
  },
} as const;

export function NoteCaptureForm({ projectId, onSuccess }: NoteCaptureFormProps) {
  const [noteType, setNoteType] = useState<NoteType | null>(null);
  const [noteText, setNoteText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>(undefined);
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsState('unavailable'); return; }
    setGpsState('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setGpsState('acquired'); },
      () => setGpsState('unavailable'),
      { timeout: 10_000, maximumAge: 60_000 }
    );
  }, []);

  useEffect(() => {
    return () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); };
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
    if (!noteType) return;
    setError(null);

    const config = TYPE_CONFIG[noteType];
    if (config.textRequired && !noteText.trim()) {
      setError('Please add a note before saving.');
      return;
    }
    if (noteType === 'site_visit' && !photoFile) {
      setError('Site visit requires a photo.');
      return;
    }
    if (!noteText.trim() && !photoFile) {
      setError('Add a note or photo before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const localId = generateLocalId();

      if (photoFile) {
        const blob = new Blob([await photoFile.arrayBuffer()], { type: photoFile.type });
        await savePhotoOffline(localId, blob, photoFile.type);
      }

      await saveSiteNoteOffline({
        localId,
        projectId,
        firmId: '',
        authorId: '',
        noteType,
        noteText: noteText.trim() || null,
        photoLocalKey: photoFile ? localId : null,
        latitude,
        longitude,
        capturedAt: new Date().toISOString(),
        syncStatus: 'pending',
        syncError: null,
        serverId: null,
      });

      try { await syncPendingNotes(); } catch { /* offline — will sync later */ }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Type selector ────────────────────────────────────────────────────────────
  if (!noteType) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-charcoal">What type of note?</p>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(TYPE_CONFIG) as [NoteType, typeof TYPE_CONFIG[NoteType]][]).map(([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setNoteType(type)}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-sand bg-white px-3 py-5 text-center transition-all hover:border-sage hover:shadow-sm active:scale-95"
              >
                <div className="rounded-xl bg-[#F8F6F1] p-2.5">
                  <Icon className="w-5 h-5 text-sage" />
                </div>
                <span className="text-[13px] font-semibold text-charcoal leading-tight">{cfg.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{cfg.sublabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[noteType];
  const Icon = cfg.icon;

  // ── Note form ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Selected type pill + change */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-sand bg-white px-3 py-1.5">
          <Icon className="w-3.5 h-3.5 text-sage" />
          <span className="text-xs font-medium text-charcoal">{cfg.label}</span>
        </div>
        <button
          type="button"
          onClick={() => { setNoteType(null); setNoteText(''); setPhotoFile(null); setPhotoPreview(undefined); setError(null); }}
          className="text-xs text-muted-foreground hover:text-charcoal underline underline-offset-2"
        >
          Change
        </button>
      </div>

      {/* Photo */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-charcoal">{cfg.photoLabel}</label>
        <CameraButton onCapture={handleCapture} preview={photoPreview} />
      </div>

      {/* Note text */}
      <div className="space-y-1.5">
        <label htmlFor="note-text" className="text-sm font-medium text-charcoal">
          Note{cfg.textRequired ? ' *' : ' (optional)'}
        </label>
        <Textarea
          id="note-text"
          placeholder={cfg.textPlaceholder}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={4}
          className="resize-none border-sand focus-visible:border-sage"
        />
      </div>

      {/* Hint */}
      <p className={`flex items-center gap-1.5 text-xs ${cfg.hintColor}`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {cfg.hint}
      </p>

      {/* GPS */}
      {gpsState === 'acquiring' && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Acquiring GPS…
        </p>
      )}
      {gpsState === 'acquired' && (
        <p className="flex items-center gap-1.5 text-xs text-sage">
          <MapPin className="w-3.5 h-3.5" />
          GPS: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full bg-sage hover:bg-sage/90 text-white">
        {submitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
        ) : (
          <><CheckCircle2 className="w-4 h-4 mr-2" />Save Note</>
        )}
      </Button>
    </form>
  );
}
