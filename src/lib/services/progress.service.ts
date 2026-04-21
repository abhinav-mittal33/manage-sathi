import type { SiteStageRow } from '@/lib/dal/stage.dal';

export interface CategoryProgress {
  key: string;
  displayName: string;
  percent: number;
  completedWeight: number;
  totalWeight: number;
}

export interface ProgressResult {
  overallPercent: number;
  completedWeight: number;
  totalWeight: number;
  byCategory: CategoryProgress[];
}

// Pure computation — no DB calls.
// Leaf nodes are rows with weight > 0 (parent/group nodes have weight stored as '0').
// totalWeight is derived dynamically from the rows — never hardcoded.
export function computeProgress(stages: SiteStageRow[]): ProgressResult {
  // Drizzle returns decimal columns as strings — parse once up front
  const parsed = stages.map((s) => ({
    ...s,
    weightNum: parseFloat(s.weight ?? '0'),
  }));

  const leafRows = parsed.filter((s) => s.weightNum > 0);

  // Top-level categories: rows with no parent (parentKey IS NULL)
  const categoryRows = parsed.filter((s) => s.parentKey === null);

  const totalWeight = leafRows.reduce((sum, s) => sum + s.weightNum, 0);
  const completedWeight = leafRows
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + s.weightNum, 0);

  const overallPercent =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 1000) / 10 : 0;

  // Build category breakdown.
  // A leaf's top-level category is the first segment of its stageKey (e.g. 'building' from 'building.foundation.excavation').
  const categoryMap = new Map<string, { displayName: string; completedWeight: number; totalWeight: number }>();

  // Seed map from top-level category rows so we preserve displayName and order
  for (const cat of categoryRows) {
    categoryMap.set(cat.stageKey, {
      displayName: cat.displayName,
      completedWeight: 0,
      totalWeight: 0,
    });
  }

  // Accumulate leaf weights into their top-level category bucket
  for (const leaf of leafRows) {
    const topKey = leaf.stageKey.split('.')[0];
    const bucket = categoryMap.get(topKey);
    if (!bucket) continue; // should not happen if DB is consistent with hierarchy

    bucket.totalWeight += leaf.weightNum;
    if (leaf.isCompleted) bucket.completedWeight += leaf.weightNum;
  }

  const byCategory: CategoryProgress[] = Array.from(categoryMap.entries()).map(([key, v]) => ({
    key,
    displayName: v.displayName,
    completedWeight: Math.round(v.completedWeight * 100) / 100,
    totalWeight: Math.round(v.totalWeight * 100) / 100,
    percent:
      v.totalWeight > 0
        ? Math.round((v.completedWeight / v.totalWeight) * 1000) / 10
        : 0,
  }));

  return {
    overallPercent,
    completedWeight: Math.round(completedWeight * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
    byCategory,
  };
}
