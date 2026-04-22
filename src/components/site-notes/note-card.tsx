import { MapPin, Clock, WifiOff, Expand } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

export interface NoteDisplay {
  id?: string;
  localId: string;
  noteText?: string | null;
  photoUrl?: string | null;
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

export function NoteCard({ note, selected, onSelect, onPhotoClick }: NoteCardProps) {
  const isPending = note.syncStatus === 'pending' || note.syncStatus === 'syncing';
  const isError = note.syncStatus === 'error';
  const selectable = onSelect !== undefined;

  return (
    <Card className={`bg-white border-sand overflow-hidden transition-colors ${selected ? 'ring-2 ring-sage border-sage' : ''}`}>
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
        </div>
      )}

      <CardContent className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          {/* Sync badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isPending && (
              <Badge variant="secondary" className="bg-sand text-charcoal gap-1 text-[11px]">
                <WifiOff className="w-3 h-3" />
                Pending sync
              </Badge>
            )}
            {isError && (
              <Badge variant="destructive" className="gap-1 text-[11px]">
                Sync failed
              </Badge>
            )}
            {note.projectName && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {note.projectName}
              </span>
            )}
          </div>

          {/* Checkbox */}
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

        {note.noteText && (
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
