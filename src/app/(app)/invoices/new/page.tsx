'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { Label } from '@/components/ui/label';
import type { ProjectWithClient } from '@/lib/services/project.service';

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId') ?? undefined;

  const [projects, setProjects] = useState<ProjectWithClient[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(urlProjectId);
  const [meta, setMeta] = useState<{ clientId?: string; projectName?: string }>({});
  const [loadingProjects, setLoadingProjects] = useState(!urlProjectId);

  // Load all projects for selector (only when no projectId in URL)
  useEffect(() => {
    if (urlProjectId) return;
    fetch('/api/v1/projects')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProjects(d.data);
      })
      .finally(() => setLoadingProjects(false));
  }, [urlProjectId]);

  // Load project meta whenever selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) return;
    fetch(`/api/v1/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMeta({ clientId: d.data.clientId, projectName: d.data.name });
      });
  }, [selectedProjectId]);

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="New Invoice" />

      {/* Project selector — only shown when no projectId in URL */}
      {!urlProjectId && (
        <div className="space-y-1.5">
          <Label>Project *</Label>
          {loadingProjects ? (
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          ) : (
            <select
              value={selectedProjectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value || undefined)}
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.client ? ` — ${p.client.name}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <InvoiceForm
        projectId={selectedProjectId}
        clientId={meta.clientId}
        projectName={meta.projectName}
      />
    </div>
  );
}
