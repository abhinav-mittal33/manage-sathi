import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/services/project.service';
import { listClients } from '@/lib/services/client.service';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectForm } from '@/components/projects/project-form';

interface Props {
  params: { id: string };
}

export default async function EditProjectPage({ params }: Props) {
  const user = await requireAuth();
  const [project, clients] = await Promise.all([
    getProject(params.id, user.firmId),
    listClients(user.firmId),
  ]);

  if (!project) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="Edit project" description={project.name} />
      <ProjectForm
        clients={clients}
        projectId={project.id}
        defaultValues={{
          name: project.name,
          clientId: project.clientId,
          addressLine1: project.addressLine1 ?? '',
          addressLine2: project.addressLine2 ?? '',
          city: project.city ?? '',
          state: project.state ?? '',
          pincode: project.pincode ?? '',
          status: project.status as 'active' | 'on_hold' | 'completed' | 'cancelled',
          currentPhase: (project.currentPhase ?? 'drawing') as 'drawing' | 'building' | 'finishing' | 'electrical' | 'plumbing' | 'door_window' | 'railing' | 'complete',
        }}
      />
    </div>
  );
}
