'use client';

import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StageProgressBar } from './stage-progress-bar';
import { StageCategory } from './stage-category';
import type { SiteStageRow } from './stage-item';

// API response shape for progress endpoint
interface StageProgress {
  overallPercent: number;
  completedWeight: number;
  totalWeight: number;
  byCategory: Array<{
    key: string;
    displayName: string;
    percent: number;
    completedWeight: number;
    totalWeight: number;
  }>;
}

interface StageChecklistProps {
  projectId: string;
  onProgressChange?: (percent: number) => void;
}

// Root categories are stages where parentKey is null
function getRootCategories(stages: SiteStageRow[]): SiteStageRow[] {
  return stages
    .filter((s) => s.parentKey === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// All descendants (any depth) of a given categoryKey
function getDescendants(categoryKey: string, stages: SiteStageRow[]): SiteStageRow[] {
  const stageMap = new Map<string, SiteStageRow>(stages.map((s) => [s.stageKey, s]));
  const result: SiteStageRow[] = [];
  const queue: string[] = [categoryKey];

  // BFS to collect all descendants
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const stage of stages) {
      if (stage.parentKey === current) {
        result.push(stage);
        queue.push(stage.stageKey);
      }
    }
  }

  // Suppress unused variable — stageMap kept for potential future O(1) lookups
  void stageMap;
  return result;
}

// Recalculate per-category progress from local stage state
function calcCategoryProgress(categoryKey: string, stages: SiteStageRow[]): number {
  const descendants = getDescendants(categoryKey, stages);
  const leafDescendants = descendants.filter((s) => parseFloat(s.weight) > 0);
  if (leafDescendants.length === 0) return 0;

  const total = leafDescendants.reduce((sum, s) => sum + parseFloat(s.weight), 0);
  const completed = leafDescendants
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + parseFloat(s.weight), 0);

  return total > 0 ? (completed / total) * 100 : 0;
}

// Recalculate overall progress from local stage state
function calcOverallProgress(stages: SiteStageRow[]): number {
  const leafStages = stages.filter((s) => parseFloat(s.weight) > 0);
  if (leafStages.length === 0) return 0;

  const total = leafStages.reduce((sum, s) => sum + parseFloat(s.weight), 0);
  const completed = leafStages
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + parseFloat(s.weight), 0);

  return total > 0 ? (completed / total) * 100 : 0;
}

export function StageChecklist({ projectId, onProgressChange }: StageChecklistProps) {
  const [stages, setStages] = useState<SiteStageRow[]>([]);
  const [progress, setProgress] = useState<StageProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [stagesRes, progressRes] = await Promise.all([
          fetch(`/api/v1/projects/${projectId}/stages`),
          fetch(`/api/v1/projects/${projectId}/stages/progress`),
        ]);

        if (!stagesRes.ok || !progressRes.ok) {
          throw new Error('Failed to load stage data. Please refresh and try again.');
        }

        const [stagesJson, progressJson] = await Promise.all([
          stagesRes.json() as Promise<{ success: boolean; data: SiteStageRow[] }>,
          progressRes.json() as Promise<{ success: boolean; data: StageProgress }>,
        ]);

        if (!cancelled) {
          setStages(stagesJson.data);
          setProgress(progressJson.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleToggle = useCallback(
    async (id: string, isCompleted: boolean) => {
      // Optimistic update
      setStages((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null }
            : s
        )
      );

      try {
        const res = await fetch(`/api/v1/projects/${projectId}/stages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted }),
        });

        if (!res.ok) {
          throw new Error('Toggle failed');
        }

        // Update overall progress after successful toggle
        setStages((currentStages) => {
          const newOverall = calcOverallProgress(currentStages);
          onProgressChange?.(Math.round(newOverall * 10) / 10);
          return currentStages;
        });
      } catch {
        // Revert on error
        setStages((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, isCompleted: !isCompleted, completedAt: !isCompleted ? new Date().toISOString() : null }
              : s
          )
        );
      }
    },
    [projectId, onProgressChange]
  );

  if (loading) {
    return <StageChecklistSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const rootCategories = getRootCategories(stages);
  const overallPercent =
    stages.length > 0 ? calcOverallProgress(stages) : (progress?.overallPercent ?? 0);
  const displayPercent = Math.round(overallPercent * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Overall progress — large banner */}
      <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#2C2A26]">Overall Progress</h2>
          <span className="text-2xl font-bold text-[#8A9A7B]">{displayPercent}%</span>
        </div>
        <StageProgressBar percent={overallPercent} height="lg" />
        {progress && (
          <p className="mt-2 text-xs text-[#2C2A26]/50">
            {progress.completedWeight.toFixed(1)} / {progress.totalWeight.toFixed(1)} weight points
            completed
          </p>
        )}
      </div>

      {/* Per-category accordions */}
      <div className="space-y-3">
        {rootCategories.map((category) => {
          const descendants = getDescendants(category.stageKey, stages);
          const catProgress = calcCategoryProgress(category.stageKey, stages);

          return (
            <StageCategory
              key={category.stageKey}
              categoryKey={category.stageKey}
              displayName={category.displayName}
              stages={descendants}
              categoryProgress={catProgress}
              onToggle={handleToggle}
            />
          );
        })}

        {rootCategories.length === 0 && (
          <div className="rounded-xl border bg-white px-5 py-8 text-center">
            <p className="text-sm text-[#2C2A26]/50">No stages found for this project.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StageChecklistSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overall progress skeleton */}
      <div className="rounded-xl border bg-white px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-14" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>

      {/* Category skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border bg-white px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
