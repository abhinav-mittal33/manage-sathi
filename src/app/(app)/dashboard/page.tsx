'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import type { ProjectWithClient } from '@/lib/dal/project.dal';
import type { ReminderRow } from '@/lib/dal/reminder.dal';

interface DashboardData {
  activeProjects: number;
  pendingDrawings: number;
  pendingInvoices: number;
  siteNotesToday: number;
  upcomingReminders: ReminderRow[];
  recentProjects: ProjectWithClient[];
}

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

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: string | number;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className={`rounded-xl p-4 ${color} ${href ? 'hover:opacity-90 transition-opacity cursor-pointer' : ''}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function isOverdue(dueDate: string): boolean {
  return dueDate < new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/dashboard')
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setData(body.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your projects and activity" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Active Projects"
              value={data?.activeProjects ?? 0}
              color="bg-sage/10 text-sage"
            />
            <StatCard
              label="Pending Drawings"
              value={data?.pendingDrawings ?? 0}
              color="bg-sand/30 text-charcoal"
            />
            <StatCard
              label="Pending Invoices"
              value={data?.pendingInvoices ?? 0}
              color="bg-sand/30 text-charcoal"
            />
            <StatCard
              label="Site Notes Today"
              value={data?.siteNotesToday ?? 0}
              color="bg-plaster border border-border text-charcoal"
            />
          </>
        )}
      </div>

      {/* Upcoming reminders */}
      {!isLoading && data && data.upcomingReminders.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-[#8A9A7B]" />
            <h2 className="text-base font-semibold text-charcoal">Upcoming Reminders</h2>
          </div>
          <div className="space-y-2">
            {data.upcomingReminders.map((r) => {
              const overdue = isOverdue(r.dueDate as string);
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                    overdue
                      ? 'border-red-200 bg-red-50'
                      : 'border-[#D1BFA7] bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {overdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    <span className={`text-sm font-medium truncate ${overdue ? 'text-red-800' : 'text-charcoal'}`}>
                      {r.title}
                    </span>
                  </div>
                  <span className={`text-xs shrink-0 ml-3 ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {overdue ? 'Overdue · ' : ''}{formatDueDate(r.dueDate as string)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent projects */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-charcoal mb-4">Recent Projects</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-lg" />
            ))}
          </div>
        ) : data && data.recentProjects.length > 0 ? (
          <div className="space-y-2">
            {data.recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-sage/50 hover:bg-sage/5 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-charcoal truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {project.client && (
                        <p className="text-xs text-muted-foreground">{project.client.name}</p>
                      )}
                      {project.currentPhase && (
                        <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                          {PHASE_LABELS[project.currentPhase] ?? project.currentPhase}
                        </span>
                      )}
                    </div>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
            <Link
              href="/clients/new"
              className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage/90 transition-colors"
            >
              Add Client & Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
