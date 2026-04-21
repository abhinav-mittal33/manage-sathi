import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, User, Pencil, FileText, CheckSquare, StickyNote, Receipt } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/services/project.service';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

const NAV_ITEMS = [
  { href: 'drawings', label: 'Drawings', icon: FileText },
  { href: 'stages', label: 'Site Stages', icon: CheckSquare },
  { href: 'notes', label: 'Site Notes', icon: StickyNote },
  { href: 'invoices', label: 'Invoices', icon: Receipt },
];

interface Props {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: Props) {
  const user = await requireAuth();
  const project = await getProject(params.id, user.firmId);

  if (!project) notFound();

  const address = [
    project.addressLine1,
    project.addressLine2,
    project.city,
    project.state,
    project.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.client?.name}
        actions={
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          </Link>
        }
      />

      {/* Meta card */}
      <Card className="bg-white border-sand">
        <CardContent className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ProjectStatusBadge status={project.status} />
            <span className="text-xs text-muted-foreground">
              Phase:{' '}
              <span className="text-charcoal">
                {PHASE_LABELS[project.currentPhase ?? ''] ?? project.currentPhase}
              </span>
            </span>
          </div>
          {project.client && (
            <div className="flex items-center gap-1.5 text-sm text-charcoal">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <Link
                href={`/clients/${project.client.id}`}
                className="hover:text-sage transition-colors"
              >
                {project.client.name}
              </Link>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{project.client.phone}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-1.5 text-sm text-charcoal">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section nav */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={`/projects/${project.id}/${href}`} className="block group">
            <Card className="bg-white border-sand hover:border-sage transition-colors duration-150 h-full">
              <CardContent className="px-4 py-5 flex flex-col items-center gap-2 text-center">
                <Icon className="w-6 h-6 text-sage" />
                <span className="text-sm font-medium text-charcoal">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
