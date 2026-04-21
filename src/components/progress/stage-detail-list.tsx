import type { CategoryProgress } from '@/lib/services/progress.service';
import { StageProgressBar } from '@/components/stages/stage-progress-bar';

interface StageDetailListProps {
  byCategory: CategoryProgress[];
}

export function StageDetailList({ byCategory }: StageDetailListProps) {
  if (byCategory.length === 0) return null;
  return (
    <div className="space-y-3">
      {byCategory.map((cat) => (
        <div key={cat.key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-charcoal">{cat.displayName}</span>
            <span className="text-xs text-muted-foreground">{cat.percent}%</span>
          </div>
          <StageProgressBar percent={cat.percent} />
        </div>
      ))}
    </div>
  );
}
