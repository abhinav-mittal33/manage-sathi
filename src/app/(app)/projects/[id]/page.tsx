import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, User, Pencil, FileText, CheckSquare, StickyNote, Receipt, TrendingUp } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { getProject } from '@/lib/services/project.service';
import { getStagesForProject } from '@/lib/dal/stage.dal';
import { computeProgress } from '@/lib/services/progress.service';
import { getLatestDrawingForProject } from '@/lib/dal/drawing.dal';
import { listReminders } from '@/lib/dal/reminder.dal';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReminderList } from '@/components/reminders/reminder-list';

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

const DRAWING_TYPE_LABELS: Record<string, string> = {
  brief: 'Brief',
  planning: 'Planning',
  structural: 'Structural Drawing',
  mep_electrical: 'MEP — Electrical',
  mep_plumbing: 'MEP — Plumbing',
  mep_hvac: 'MEP — HVAC',
  exterior_design: 'Exterior Design',
  interior_drawing: 'Interior Drawing',
};

const DRAWING_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  submitted: 'Submitted',
  approved: 'Approved',
  revised: 'Revision requested',
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

  const [project, stages, latestDrawing, reminders] = await Promise.all([
    getProject(params.id, user.firmId),
    getStagesForProject(params.id, user.firmId),
    getLatestDrawingForProject(params.id, user.firmId),
    listReminders(user.firmId, { projectId: params.id, limit: 20 }),
  ]);

  if (!project) notFound();

  const progress = computeProgress(stages);

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

          {/* Progress bar */}
          {progress.totalWeight > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  Overall progress
                </span>
                <span className="font-semibold text-[#2C2A26]">{progress.overallPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#D1BFA7]/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#8A9A7B] transition-all"
                  style={{ width: `${progress.overallPercent}%` }}
                />
              </div>
            </div>
          )}

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

          {/* Last drawing info */}
          {latestDrawing && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-[#D1BFA7]/40">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>
                Last drawing:{' '}
                <span className="text-charcoal font-medium">
                  {DRAWING_TYPE_LABELS[latestDrawing.drawingType] ?? latestDrawing.drawingType}
                </span>
                {' · '}
                <span className={latestDrawing.status === 'approved' ? 'text-[#4d6040]' : latestDrawing.status === 'revised' ? 'text-amber-700' : ''}>
                  {DRAWING_STATUS_LABELS[latestDrawing.status] ?? latestDrawing.status}
                </span>
                {latestDrawing.submittedAt && (
                  <>
                    {' · '}
                    {new Date(latestDrawing.submittedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </>
                )}
              </span>
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

      {/* Reminders panel */}
      <Card className="bg-white border-sand">
        <CardContent className="px-4 py-4">
          <ReminderList projectId={project.id} initialReminders={reminders} />
        </CardContent>
      </Card>
    </div>
  );
}
