import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/services/project.service';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { SyncStatusIndicator } from '@/components/site-notes/sync-status-indicator';
import { NoteList } from '@/components/site-notes/note-list';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectNotesPage({ params }: Props) {
  const { id } = await params;
  const user = await requireAuth();
  const project = await getProject(id, user.firmId);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Notes"
        description={project.name}
        actions={
          <Link href={`/projects/${project.id}/notes/new`}>
            <Button size="sm" className="bg-sage hover:bg-sage/90 text-white gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </Button>
          </Link>
        }
      />

      {/* SyncStatusIndicator is a client component — reads IDB */}
      <SyncStatusIndicator />

      <NoteList projectId={id} />
    </div>
  );
}
