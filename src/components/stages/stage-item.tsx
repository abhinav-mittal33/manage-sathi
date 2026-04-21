'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Matches the API response shape for a single stage row
export interface SiteStageRow {
  id: string;
  stageKey: string;
  displayName: string;
  parentKey: string | null;
  sortOrder: number;
  weight: string;   // decimal as string; '0' means parent/group node
  isCompleted: boolean;
  completedAt: string | null;
}

interface StageItemProps {
  stage: SiteStageRow;
  onToggle: (id: string, isCompleted: boolean) => void;
  disabled?: boolean;
}

export function StageItem({ stage, onToggle, disabled = false }: StageItemProps) {
  const weightNum = parseFloat(stage.weight);

  function handleCheckedChange(checked: boolean | 'indeterminate') {
    if (checked === 'indeterminate') return;
    onToggle(stage.id, checked);
  }

  return (
    <div className="flex items-center gap-3 min-h-[44px] py-1 px-2 rounded-md hover:bg-[#F8F6F1]/80 transition-colors">
      <Checkbox
        checked={stage.isCompleted}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
        aria-label={`Mark "${stage.displayName}" as ${stage.isCompleted ? 'incomplete' : 'complete'}`}
        // Override with sage green when checked via CSS variable approach
        className={
          stage.isCompleted
            ? '[&[data-checked]]:border-[#8A9A7B] [&[data-checked]]:bg-[#8A9A7B]'
            : ''
        }
      />

      <span
        className={`flex-1 text-sm text-[#2C2A26] leading-snug ${
          stage.isCompleted ? 'line-through text-[#2C2A26]/50' : ''
        }`}
      >
        {stage.displayName}
      </span>

      {weightNum > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] font-medium shrink-0 text-[#2C2A26]/60 border-[#D1BFA7]"
        >
          {weightNum}w
        </Badge>
      )}
    </div>
  );
}
