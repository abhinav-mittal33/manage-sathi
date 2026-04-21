'use client';

import { useState, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectCard } from './project-card';
import type { ProjectWithClient } from '@/lib/services/project.service';

interface ProjectListProps {
  clientId?: string;
}

export function ProjectList({ clientId }: ProjectListProps) {
  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const params = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
        const res = await fetch(`/api/v1/projects${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message ?? 'Failed to load projects');
        setProjects(json.data as ProjectWithClient[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="w-12 h-12 rounded-full bg-sand/40 flex items-center justify-center">
          <FolderOpen className="w-6 h-6 text-sage" />
        </div>
        <p className="text-charcoal font-medium">No projects yet</p>
        <p className="text-sm text-muted-foreground">
          Create a project via the Clients page
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
      <p className="text-xs text-muted-foreground text-center pt-1">
        {projects.length} project{projects.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
