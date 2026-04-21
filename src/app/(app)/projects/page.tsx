import { PageHeader } from '@/components/layout/page-header';
import { ProjectList } from '@/components/projects/project-list';

interface ProjectsPageProps {
  searchParams: { clientId?: string };
}

export default function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { clientId } = searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={clientId ? 'Filtered by client' : 'All active projects'}
      />
      <ProjectList clientId={clientId} />
    </div>
  );
}
