import { notFound } from 'next/navigation';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { db } from '@/db';
import { projects, clients, siteStages, drawings } from '@/db/schema';
import { computeProgress } from '@/lib/services/progress.service';
import { ProgressSummary } from '@/components/progress/progress-summary';
import { StageDetailList } from '@/components/progress/stage-detail-list';

export const metadata = { robots: 'noindex' };

interface Props {
  params: { projectId: string };
}

export default async function PublicProgressPage({ params }: Props) {
  const [projectRow] = await db
    .select({
      id: projects.id,
      name: projects.name,
      currentPhase: projects.currentPhase,
      status: projects.status,
      clientName: clients.name,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, params.projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!projectRow) notFound();

  const [stageRows, drawingRows] = await Promise.all([
    db.select().from(siteStages).where(eq(siteStages.projectId, params.projectId)).orderBy(asc(siteStages.sortOrder)),
    db.select({ status: drawings.status }).from(drawings).where(and(eq(drawings.projectId, params.projectId), isNull(drawings.deletedAt))),
  ]);

  const progress = computeProgress(stageRows);
  const drawingStats = { total: drawingRows.length, approved: drawingRows.filter((d) => d.status === 'approved').length };

  return (
    <div className="min-h-screen bg-[#F8F6F1]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-8">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Project Progress</p>
          <h1 className="text-2xl font-bold text-charcoal">{projectRow.name}</h1>
          {projectRow.clientName && (
            <p className="text-sm text-muted-foreground mt-0.5">{projectRow.clientName}</p>
          )}
        </div>

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

        <p className="text-xs text-center text-muted-foreground pt-4 border-t border-sand">
          Powered by Manage Sathi
        </p>
      </div>
    </div>
  );
}
