'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { NoteCaptureForm } from '@/components/site-notes/note-capture-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Project {
  id: string;
  name: string;
}

export default function NewSiteNotePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      try {
        const res = await fetch('/api/v1/projects?limit=100');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const list: Project[] = (json.data ?? []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }));
          setProjects(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProjects();
    return () => { cancelled = true; };
  }, []);

  function handleSuccess() {
    router.push('/site-diary');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Site Note"
        description="Select a project and capture your observation"
        actions={
          <Link href="/site-diary">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </Button>
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-sand bg-white px-4 py-6 text-center text-sm text-muted-foreground">
          No active projects found.{' '}
          <Link href="/projects" className="text-sage underline underline-offset-2">
            Create a project first.
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project selector */}
          <div className="space-y-1.5">
            <label htmlFor="project-select" className="text-sm font-medium text-charcoal">
              Project
            </label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 transition-colors"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Note capture form — only shown once project is selected */}
          {selectedProjectId && (
            <div className="rounded-xl border border-sand bg-white px-4 py-5">
              <NoteCaptureForm
                projectId={selectedProjectId}
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
