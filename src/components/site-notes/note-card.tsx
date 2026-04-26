import { MapPin, Clock, WifiOff, Expand, Lock, Camera, MessageSquareDiff, CheckCircle2, XCircle, Timer } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

type NoteType = 'site_visit' | 'personal' | 'approval_request';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface NoteDisplay {
  id?: string;
  localId: string;
  noteType?: NoteType;
  approvalStatus?: ApprovalStatus | null;
  noteText?: string | null;
  photoUrl?: string | null;
  clientResponseText?: string | null;
  capturedAt: string;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  projectName?: string;
}

interface NoteCardProps {
  note: NoteDisplay;
  selected?: boolean;
  onSelect?: (localId: string, checked: boolean) => void;
  onPhotoClick?: (url: string) => void;
}

const TYPE_META: Record<NoteType, { icon: React.ElementType; label: string; color: string }> = {
  site_visit:       { icon: Camera,             label: 'Site Visit',      color: 'text-sage' },
  personal:         { icon: Lock,               label: 'My Note',         color: 'text-muted-foreground' },
  approval_request: { icon: MessageSquareDiff,  label: 'Approval',        color: 'text-amber-600' },
};

const APPROVAL_BADGE: Record<ApprovalStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending:  { label: 'Pending approval', className: 'bg-amber-50 text-amber-700 border-amber-200',  icon: Timer },
  approved: { label: 'Approved',         className: 'bg-sage/10 text-sage border-sage/30',           icon: CheckCircle2 },
  rejected: { label: 'Rejected',         className: 'bg-red-50 text-red-600 border-red-200',         icon: XCircle },
};

export function NoteCard({ note, selected, onSelect, onPhotoClick }: NoteCardProps) {
  const isPending  = note.syncStatus === 'pending' || note.syncStatus === 'syncing';
  const isError    = note.syncStatus === 'error';
  const selectable = onSelect !== undefined;
  const type       = note.noteType ?? 'personal';
  const meta       = TYPE_META[type];
  const TypeIcon   = meta.icon;

  return (
    <Card className={`bg-white border-sand overflow-hidden transition-all ${selected ? 'ring-2 ring-sage border-sage' : ''}`}>
      {/* Photo */}
      {note.photoUrl && (
        <div className="relative w-full h-48 group cursor-pointer" onClick={() => onPhotoClick?.(note.photoUrl!)}>
          <Image
            src={note.photoUrl}
            alt="Site photo"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 640px"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2">
              <Expand className="w-5 h-5 text-white" />
            </div>
          </div>
          {/* Type icon overlay on photo */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
            <TypeIcon className="w-3 h-3 text-white" />
            <span className="text-[11px] font-medium text-white">{meta.label}</span>
          </div>
        </div>
      )}

      <CardContent className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Type badge (no photo = show here) */}
            {!note.photoUrl && (
              <span className={`flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
                <TypeIcon className="w-3.5 h-3.5" />
                {meta.label}
              </span>
            )}

            {/* Approval status badge */}
            {type === 'approval_request' && note.approvalStatus && (() => {
              const ab = APPROVAL_BADGE[note.approvalStatus as ApprovalStatus];
              const AIcon = ab.icon;
              return (
                <Badge variant="outline" className={`gap-1 text-[11px] ${ab.className}`}>
                  <AIcon className="w-3 h-3" />
                  {ab.label}
                </Badge>
              );
            })()}

            {/* Site visit sent badge */}
            {type === 'site_visit' && !isPending && (
              <Badge variant="outline" className="gap-1 text-[11px] bg-sage/10 text-sage border-sage/30">
                <CheckCircle2 className="w-3 h-3" />
                Sent to client
              </Badge>
            )}

            {/* Sync badges */}
            {isPending && (
              <Badge variant="secondary" className="bg-sand text-charcoal gap-1 text-[11px]">
                <WifiOff className="w-3 h-3" />
                Pending sync
              </Badge>
            )}
            {isError && (
              <Badge variant="destructive" className="gap-1 text-[11px]">Sync failed</Badge>
            )}

            {note.projectName && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">{note.projectName}</span>
            )}
          </div>

          {selectable && (
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={(e) => onSelect(note.localId, e.target.checked)}
              className="w-4 h-4 rounded accent-sage shrink-0 cursor-pointer mt-0.5"
              aria-label="Select note"
            />
          )}
        </div>

        {type === 'approval_request' && note.noteText && (
          <p className="text-sm text-charcoal leading-relaxed">
            <span className="font-medium text-amber-600">Suggestion: </span>
            {note.noteText}
          </p>
        )}
        {type === 'approval_request' && note.clientResponseText && (
          <p className="text-sm text-charcoal leading-relaxed">
            <span className="font-medium text-sage">Client replied: </span>
            {note.clientResponseText}
          </p>
        )}
        {type !== 'approval_request' && note.noteText && (
          <p className="text-sm text-charcoal leading-relaxed">{note.noteText}</p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <time dateTime={note.capturedAt}>{formatDateTime(note.capturedAt)}</time>
        </div>
      </CardContent>
    </Card>
  );
}
