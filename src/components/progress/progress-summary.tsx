import type { ProgressResult } from '@/lib/services/progress.service';

interface ProgressSummaryProps {
  progress: ProgressResult;
  drawings: { total: number; approved: number };
  projectName: string;
  currentPhase?: string | null;
}

const PHASE_LABELS: Record<string, string> = {
  drawing: 'Drawings', building: 'Building', finishing: 'Finishing',
  electrical: 'Electrical', plumbing: 'Plumbing', door_window: 'Door / Window',
  railing: 'Railing', complete: 'Complete',
};

export function ProgressSummary({ progress, drawings, projectName, currentPhase }: ProgressSummaryProps) {
  const pct = Math.round(progress.overallPercent);
  const drawingPct = drawings.total > 0 ? Math.round((drawings.approved / drawings.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall progress ring */}
      <div className="flex items-center gap-6">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#D1BFA7" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#8A9A7B" strokeWidth="3"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-charcoal">
            {pct}%
          </span>
        </div>
        <div>
          <p className="font-semibold text-charcoal text-lg">{projectName}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overall construction progress
          </p>
          {currentPhase && (
            <p className="text-xs text-muted-foreground mt-1">
              Current phase:{' '}
              <span className="text-charcoal font-medium">
                {PHASE_LABELS[currentPhase] ?? currentPhase}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Drawings approved */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-charcoal">Drawings</span>
          <span className="text-xs text-muted-foreground">
            {drawings.approved}/{drawings.total} approved
          </span>
        </div>
        <div className="h-2 bg-sand rounded-full overflow-hidden">
          <div
            className="h-full bg-sage rounded-full transition-all"
            style={{ width: `${drawingPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
