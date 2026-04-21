import { notFound } from 'next/navigation';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { db } from '@/db';
import { projects, clients, siteStages, drawings } from '@/db/schema';
import { computeProgress } from '@/lib/services/progress.service';
import { requireAuth } from '@/lib/auth';
import { PageHeader } from '@/components/layout/page-header';
import { ProgressSummary } from '@/components/progress/progress-summary';
import { StageDetailList } from '@/components/progress/stage-detail-list';
import { ShareProgressButton } from '@/components/progress/share-progress-button';

interface Props {
  params: { id: string };
}

export default async function ProjectProgressPage({ params }: Props) {
  const user = await requireAuth();

  const [projectRow] = await db
    .select({
      id: projects.id,
      name: projects.name,
      currentPhase: projects.currentPhase,
      status: projects.status,
      firmId: projects.firmId,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, params.id), isNull(projects.deletedAt)))
    .limit(1);

  if (!projectRow || projectRow.firmId !== user.firmId) notFound();

  const [stageRows, drawingRows] = await Promise.all([
    db.select().from(siteStages).where(eq(siteStages.projectId, params.id)).orderBy(asc(siteStages.sortOrder)),
    db.select({ status: drawings.status }).from(drawings).where(and(eq(drawings.projectId, params.id), isNull(drawings.deletedAt))),
  ]);

  const progress = computeProgress(stageRows);
  const drawingStats = { total: drawingRows.length, approved: drawingRows.filter((d) => d.status === 'approved').length };

  return (
    <div className="space-y-8 max-w-lg">
      <PageHeader
        title="Progress"
        description={projectRow.name}
        actions={<ShareProgressButton projectId={params.id} />}
      />
      <ProgressSummary
        progress={progress}
        drawings={drawingStats}
        projectName={projectRow.name}
        currentPhase={projectRow.currentPhase}
      />
      <div>
        <h2 className="text-sm font-semibold text-charcoal uppercase tracking-wide mb-3">By Stage</h2>
        <StageDetailList byCategory={progress.byCategory} />
      </div>
    </div>
  );
}
