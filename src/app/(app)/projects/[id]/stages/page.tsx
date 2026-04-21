import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/services/project.service';
import { PageHeader } from '@/components/layout/page-header';
import { StageChecklist } from '@/components/stages/stage-checklist';
import { Button } from '@/components/ui/button';

interface Props {
  params: { id: string };
}

export default async function ProjectStagesPage({ params }: Props) {
  const user = await requireAuth();
  const project = await getProject(params.id, user.firmId);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Stages"
        description={project.name}
        actions={
          <Link href={`/projects/${project.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Project
            </Button>
          </Link>
        }
      />

      <StageChecklist projectId={project.id} />
    </div>
  );
}
