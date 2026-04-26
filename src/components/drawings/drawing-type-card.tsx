'use client';

import { useState } from 'react';
import { ExternalLink, Send, RefreshCw, Loader2, History, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DrawingStatusFlow } from './drawing-status-flow';
import { DrawingUploadDialog } from './drawing-upload-dialog';
import type { DrawingStatus, DrawingType } from '@/types';

export interface DrawingRow {
  id: string;
  firmId: string;
  projectId: string;
  drawingType: DrawingType;
  status: DrawingStatus;
  version: number;
  fileUrl: string | null;
  notes: string | null;
  clientSuggestion: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
}

const DRAWING_TYPE_LABELS: Record<DrawingType, string> = {
  brief: 'Brief',
  planning: 'Planning',
  structural: 'Structural Drawing',
  mep_electrical: 'MEP — Electrical',
  mep_plumbing: 'MEP — Plumbing',
  mep_hvac: 'MEP — HVAC',
  exterior_design: 'Exterior Design',
  interior_drawing: 'Interior Drawing',
};

const STATUS_BADGE_STYLES: Record<DrawingStatus, { bg: string; text: string; label: string }> = {
  not_started: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: 'Not Started',
  },
  submitted: {
    bg: 'bg-[#D1BFA7]/40',
    text: 'text-[#6b5a45]',
    label: 'Submitted — Awaiting Approval',
  },
  approved: {
    bg: 'bg-[#8A9A7B]/20',
    text: 'text-[#4d6040]',
    label: 'Approved',
  },
  revised: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Revision Requested',
  },
};

interface DrawingTypeCardProps {
  drawing: DrawingRow | null;
  drawingType: DrawingType;
  projectId: string;
  onRefresh: () => void;
}

export function DrawingTypeCard({
  drawing,
  drawingType,
  projectId,
  onRefresh,
}: DrawingTypeCardProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<DrawingRow[] | null>(null);

  const status: DrawingStatus = drawing?.status ?? 'not_started';
  const badge = STATUS_BADGE_STYLES[status];
  const typeLabel = DRAWING_TYPE_LABELS[drawingType];

  async function handleResendWhatsApp() {
    if (!drawing) return;
    setResending(true);
    setResendError(null);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/drawings/${drawing.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'resend_whatsapp' }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to resend WhatsApp message.');
      }
      onRefresh();
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Resend failed.');
    } finally {
      setResending(false);
    }
  }

  async function handleStartRevision() {
    if (!drawing) return;
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/drawings/${drawing.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_revision' }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to start revision.');
      }
      onRefresh();
    } catch (err) {
      // Surface error in a simple alert — full error handling deferred to Phase 5
      alert(err instanceof Error ? err.message : 'Could not start revision.');
    }
  }

  async function handleToggleHistory() {
    if (historyOpen) { setHistoryOpen(false); return; }
    setHistoryOpen(true);
    if (historyVersions !== null) return; // already loaded
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/drawings/history?drawingType=${drawingType}`
      );
      const body = await res.json();
      setHistoryVersions(body.data ?? []);
    } catch {
      setHistoryVersions([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  // For revised uploads the new version number is current + 1
  const nextVersion = drawing ? drawing.version + 1 : 1;

  return (
    <>
      <Card className="bg-white border border-[#D1BFA7] flex flex-col h-full">
        <CardContent className="px-4 py-4 flex flex-col gap-3 h-full">
          {/* Header row: type label + status badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#2C2A26] leading-snug">{typeLabel}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shrink-0 ${badge.bg} ${badge.text}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Status flow timeline */}
          <DrawingStatusFlow status={status} />

          {/* Version + file link (only when a drawing row exists) */}
          {drawing && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Version {drawing.version}</span>
              {drawing.fileUrl && (
                <a
                  href={drawing.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#8A9A7B] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View file
                </a>
              )}
              {drawing.approvedAt && (
                <span>
                  Approved {new Date(drawing.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          )}

          {/* Client suggestion from WhatsApp reply */}
          {drawing?.clientSuggestion && (
            <div className="text-xs rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-amber-800 leading-relaxed">
              <span className="font-semibold">Client: </span>
              {drawing.clientSuggestion}
            </div>
          )}

          {/* Version history toggle — only show when drawing exists */}
          {drawing && (
            <button
              onClick={handleToggleHistory}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#8A9A7B] transition-colors"
            >
              <History className="w-3 h-3" />
              Version history
              {historyOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Version history panel */}
          {historyOpen && (
            <div className="border border-[#D1BFA7] rounded-lg overflow-hidden">
              {historyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : !historyVersions || historyVersions.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3 py-3">No versions yet.</p>
              ) : (
                <div className="divide-y divide-[#D1BFA7]/60">
                  {historyVersions.map((v) => {
                    const vBadge = STATUS_BADGE_STYLES[v.status as keyof typeof STATUS_BADGE_STYLES] ?? STATUS_BADGE_STYLES.not_started;
                    return (
                      <div key={v.id} className="px-3 py-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#2C2A26]">v{v.version}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${vBadge.bg} ${vBadge.text}`}>
                            {vBadge.label}
                          </span>
                        </div>
                        {v.fileUrl && (
                          <a
                            href={v.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-[#8A9A7B] hover:underline"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            Open file
                          </a>
                        )}
                        {v.clientSuggestion && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1 leading-snug">
                            <span className="font-semibold">Client: </span>{v.clientSuggestion}
                          </p>
                        )}
                        {v.notes && (
                          <p className="text-[10px] text-muted-foreground leading-snug">
                            <span className="font-medium">Notes: </span>{v.notes}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {v.submittedAt ? `Submitted ${new Date(v.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Not yet submitted'}
                          {v.approvedAt ? ` · Approved ${new Date(v.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error state for resend */}
          {resendError && (
            <p className="text-xs text-destructive">{resendError}</p>
          )}

          {/* Action buttons — pushed to bottom */}
          <div className="mt-auto pt-2 flex flex-col gap-2">
            {status === 'not_started' && (
              <Button
                className="min-h-[44px] w-full bg-[#8A9A7B] hover:bg-[#7a8a6b] text-white border-0"
                onClick={() => setUploadOpen(true)}
              >
                Upload &amp; Submit
              </Button>
            )}

            {status === 'submitted' && (
              <>
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full text-muted-foreground cursor-default"
                  disabled
                >
                  Awaiting client approval
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] w-full gap-1.5 border-[#D1BFA7] text-[#2C2A26]"
                  onClick={handleResendWhatsApp}
                  disabled={resending}
                >
                  {resending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Resend WhatsApp
                </Button>
              </>
            )}

            {status === 'approved' && (
              <Button
                variant="outline"
                className="min-h-[44px] w-full gap-1.5 border-[#D1BFA7] text-[#2C2A26]"
                onClick={handleStartRevision}
              >
                <RefreshCw className="w-4 h-4" />
                Start Revision
              </Button>
            )}

            {status === 'revised' && (
              <Button
                className="min-h-[44px] w-full bg-amber-500 hover:bg-amber-600 text-white border-0"
                onClick={() => setUploadOpen(true)}
              >
                Upload New Version (v{nextVersion})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DrawingUploadDialog
        projectId={projectId}
        drawingType={drawingType}
        drawingId={drawing?.id}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}
