'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { DrawingTypeCard, type DrawingRow } from './drawing-type-card';
import type { DrawingType } from '@/types';

// All 8 drawing types in display order
const DRAWING_TYPES: DrawingType[] = [
  'brief',
  'planning',
  'structural',
  'mep_electrical',
  'mep_plumbing',
  'mep_hvac',
  'exterior_design',
  'interior_drawing',
];

interface DrawingGridProps {
  projectId: string;
}

export function DrawingGrid({ projectId }: DrawingGridProps) {
  const [drawings, setDrawings] = useState<DrawingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawings = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/drawings`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? 'Failed to load drawings.');
      }
      const data = await res.json();
      setDrawings(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load drawings.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  // Index drawings by type for O(1) lookup when rendering cards
  const drawingsByType = drawings.reduce<Record<string, DrawingRow>>((acc, d) => {
    acc[d.drawingType] = d;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {DRAWING_TYPES.map((type) => (
          <Skeleton key={type} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
        <p className="text-sm text-destructive font-medium">{error}</p>
        <button
          onClick={fetchDrawings}
          className="mt-3 text-xs text-[#8A9A7B] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {DRAWING_TYPES.map((type) => (
        <DrawingTypeCard
          key={type}
          drawingType={type}
          drawing={drawingsByType[type] ?? null}
          projectId={projectId}
          onRefresh={fetchDrawings}
        />
      ))}
    </div>
  );
}
