'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import type { ProjectWithClient } from '@/lib/services/project.service';

interface DashboardStats {
  activeProjects: number;
  pendingInvoices: number;
  siteNotesToday: number;
  recentProjects: ProjectWithClient[];
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10);

        const [projectsRes, invoicesRes, notesRes] = await Promise.all([
          fetch('/api/v1/projects'),
          fetch('/api/v1/invoices'),
          fetch(`/api/v1/site-notes?limit=50`),
        ]);

        const [projectsData, invoicesData, notesData] = await Promise.all([
          projectsRes.json(),
          invoicesRes.json(),
          notesRes.json(),
        ]);

        const allProjects: ProjectWithClient[] = projectsData.success ? projectsData.data : [];
        const allInvoices: { status: string }[] = invoicesData.success ? invoicesData.data : [];
        const allNotes: { createdAt: string }[] = notesData.success
          ? (notesData.data?.notes ?? notesData.data ?? [])
          : [];

        const activeProjects = allProjects.filter((p) => p.status === 'active').length;
        const pendingInvoices = allInvoices.filter(
          (inv) => inv.status === 'sent' || inv.status === 'overdue'
        ).length;
        const siteNotesToday = allNotes.filter(
          (n) => n.createdAt?.slice(0, 10) === today
        ).length;
        const recentProjects = allProjects.slice(0, 5);

        setStats({ activeProjects, pendingInvoices, siteNotesToday, recentProjects });
      } catch {
        // Silently fail — show zeros rather than crashing the dashboard
        setStats({ activeProjects: 0, pendingInvoices: 0, siteNotesToday: 0, recentProjects: [] });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your projects and activity"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard label="Active Projects" value={stats?.activeProjects ?? 0} color="bg-sage/10 text-sage" />
            <StatCard label="Pending Drawings" value="—" color="bg-sand/30 text-charcoal" />
            <StatCard label="Pending Invoices" value={stats?.pendingInvoices ?? 0} color="bg-sand/30 text-charcoal" />
            <StatCard label="Site Notes Today" value={stats?.siteNotesToday ?? 0} color="bg-plaster border border-border text-charcoal" />
          </>
        )}
      </div>

      {/* Recent projects */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-charcoal mb-4">Recent Projects</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px] rounded-lg" />
            ))}
          </div>
        ) : stats && stats.recentProjects.length > 0 ? (
          <div className="space-y-2">
            {stats.recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:border-sage/50 hover:bg-sage/5 transition-colors">
                  <div>
                    <p className="font-medium text-charcoal">{project.name}</p>
                    {project.client && (
                      <p className="text-xs text-muted-foreground mt-0.5">{project.client.name}</p>
                    )}
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
            <a
              href="/clients/new"
              className="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage/90 transition-colors"
            >
              Add Client & Project
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
