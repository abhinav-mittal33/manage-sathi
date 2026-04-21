import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { StageItem, type SiteStageRow } from './stage-item';
import { StageProgressBar } from './stage-progress-bar';

interface StageCategoryProps {
  categoryKey: string;
  displayName: string;
  /** All stage rows that belong to this category (any depth) */
  stages: SiteStageRow[];
  categoryProgress: number;
  onToggle: (id: string, isCompleted: boolean) => void;
}

/**
 * Groups leaf stages under their immediate parent within the category.
 * Returns a list of sub-groups. Each sub-group is either:
 *   - { label: null, items } — direct leaves with no intermediate parent
 *   - { label: string, items } — leaves under a named sub-group
 */
function buildSubGroups(
  categoryKey: string,
  stages: SiteStageRow[]
): Array<{ label: string | null; groupKey: string; items: SiteStageRow[] }> {
  const stageMap = new Map<string, SiteStageRow>(stages.map((s) => [s.stageKey, s]));

  // Direct children of the category (parentKey === categoryKey)
  const directChildren = stages
    .filter((s) => s.parentKey === categoryKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const groups: Array<{ label: string | null; groupKey: string; items: SiteStageRow[] }> = [];

  for (const child of directChildren) {
    const isLeaf = child.weight !== '0' && parseFloat(child.weight) > 0;

    if (isLeaf) {
      // Direct leaf — belongs to an implicit "direct" group
      const directGroup = groups.find((g) => g.groupKey === `${categoryKey}:__direct__`);
      if (directGroup) {
        directGroup.items.push(child);
      } else {
        groups.push({ label: null, groupKey: `${categoryKey}:__direct__`, items: [child] });
      }
    } else {
      // Sub-group node — find its leaf children
      const leafChildren = stages
        .filter((s) => s.parentKey === child.stageKey)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      if (leafChildren.length > 0) {
        groups.push({
          label: child.displayName,
          groupKey: child.stageKey,
          items: leafChildren,
        });
      }
    }
  }

  // Maintain category sort order: direct leaves first if they appear at top of sortOrder,
  // but since we iterate directChildren in sortOrder this is already correct.
  // Re-sort groups by their first item's sortOrder for correct visual ordering.
  // (The groupKey:__direct__ group should appear where direct leaves fall in sortOrder)
  return groups;

  // Suppress unused import warning — stageMap is only needed for potential future lookups
  void stageMap;
}

export function StageCategory({
  categoryKey,
  displayName,
  stages,
  categoryProgress,
  onToggle,
}: StageCategoryProps) {
  const subGroups = buildSubGroups(categoryKey, stages);

  return (
    <Accordion multiple defaultValue={[categoryKey]}>
      <AccordionItem value={categoryKey} className="border rounded-xl overflow-hidden bg-white">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex flex-1 flex-col gap-2 mr-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[#2C2A26]">{displayName}</span>
              <span className="text-xs font-semibold text-[#8A9A7B]">
                {Math.round(categoryProgress)}%
              </span>
            </div>
            <StageProgressBar percent={categoryProgress} height="sm" />
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-3 pb-3">
          <div className="space-y-1">
            {subGroups.map((group) => (
              <div key={group.groupKey}>
                {group.label && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2C2A26]/50 px-2 pt-2 pb-1">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((stage) => (
                    <StageItem key={stage.id} stage={stage} onToggle={onToggle} />
                  ))}
                </div>
              </div>
            ))}

            {subGroups.length === 0 && (
              <p className="text-xs text-[#2C2A26]/40 px-2 py-2">No items in this category.</p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
