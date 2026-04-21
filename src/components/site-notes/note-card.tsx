import { MapPin, Clock, WifiOff } from 'lucide-react';
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
}

export function NoteCard({ note }: NoteCardProps) {
  const isPending = note.syncStatus === 'pending' || note.syncStatus === 'syncing';
  const isError = note.syncStatus === 'error';

  return (
    <Card className="bg-white border-sand overflow-hidden">
      {note.photoUrl && (
        <div className="relative w-full h-48">
          <Image
            src={note.photoUrl}
            alt="Site photo"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 640px"
          />
        </div>
      )}

      <CardContent className="px-4 py-3 space-y-2">
        {/* Sync status badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {isPending && (
              <Badge
                variant="secondary"
                className="bg-sand text-charcoal gap-1 text-[11px]"
              >
                <WifiOff className="w-3 h-3" />
                Pending sync
              </Badge>
            )}
            {isError && (
              <Badge
                variant="destructive"
                className="gap-1 text-[11px]"
              >
                Sync failed
              </Badge>
            )}
          </div>

          {note.projectName && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {note.projectName}
            </span>
          )}
        </div>

        {/* Note text */}
        {note.noteText && (
          <p className="text-sm text-charcoal leading-relaxed">{note.noteText}</p>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <time dateTime={note.capturedAt}>{formatDateTime(note.capturedAt)}</time>
        </div>
      </CardContent>
    </Card>
  );
}
