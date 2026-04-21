'use client';

import Link from 'next/link';
import { MapPin, ChevronRight, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectStatusBadge } from './project-status-badge';
import type { ProjectWithClient } from '@/lib/services/project.service';

const PHASE_LABELS: Record<string, string> = {
  drawing: 'Drawings',
  building: 'Building',
  finishing: 'Finishing',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  door_window: 'Door / Window',
  railing: 'Railing',
  complete: 'Complete',
};

interface ProjectCardProps {
  project: ProjectWithClient;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const address = [project.city, project.state].filter(Boolean).join(', ');
  const phaseLabel = PHASE_LABELS[project.currentPhase ?? ''] ?? project.currentPhase ?? '—';

  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <Card className="bg-white border border-sand hover:border-sage transition-colors duration-150">
        <CardContent className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-charcoal truncate">{project.name}</p>
                <ProjectStatusBadge status={project.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {project.client && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 shrink-0" />
                    {project.client.name}
                  </span>
                )}
                {address && (
                  <span className="flex items-center gap-1 truncate max-w-[200px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {address}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Phase: <span className="text-charcoal">{phaseLabel}</span>
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:text-sage transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
