'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ProjectForm } from '@/components/projects/project-form';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientDTO } from '@/lib/services/client.service';

export default function NewProjectPage() {
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId') ?? undefined;

  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/clients')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setClients(d.data as ClientDTO[]);
        else setError(d.error?.message ?? 'Failed to load clients');
      })
      .catch(() => setError('Network error — could not load clients'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="New Project" />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      ) : (
        <ProjectForm
          clients={clients}
          defaultValues={preselectedClientId ? { clientId: preselectedClientId } : undefined}
        />
      )}
    </div>
  );
}
