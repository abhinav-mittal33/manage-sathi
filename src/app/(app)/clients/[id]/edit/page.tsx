'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/clients/client-form';
import type { CreateClientInput } from '@/lib/validations/client';
import type { ClientDTO } from '@/lib/services/client.service';

interface EditClientPageProps {
  params: { id: string };
}

export default function EditClientPage({ params }: EditClientPageProps) {
  const { id } = params;
  const router = useRouter();

  const [client, setClient] = useState<ClientDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    async function loadClient() {
      try {
        const res = await fetch(`/api/v1/clients/${id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message ?? 'Failed to load client');
        setClient(json.data as ClientDTO);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    }
    loadClient();
  }, [id]);

  async function handleSubmit(data: CreateClientInput) {
    setIsSaving(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/v1/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setServerError(json.error?.message ?? 'Failed to update client');
        return;
      }
      router.push(`/clients/${id}`);
    } catch {
      setServerError('Network error — please try again');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-lg">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[44px] w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (fetchError || !client) {
    return (
      <div className="space-y-4">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-2 text-charcoal">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <p className="text-red-600 font-medium">{fetchError ?? 'Client not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${id}`}>
          <Button variant="ghost" size="icon" className="text-charcoal hover:bg-sand/40 h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Back to client</span>
          </Button>
        </Link>
        <PageHeader title="Edit Client" />
      </div>

      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <ClientForm
        defaultValues={{
          name: client.name,
          phone: client.phone,
          email: client.email ?? '',
          address: client.address ?? '',
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
        isLoading={isSaving}
      />
    </div>
  );
}
