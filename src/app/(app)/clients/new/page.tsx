'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/clients/client-form';
import type { CreateClientInput } from '@/lib/validations/client';

export default function NewClientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(data: CreateClientInput) {
    setIsLoading(true);
    setServerError(null);
    try {
      const res = await fetch('/api/v1/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setServerError(json.error?.message ?? 'Failed to create client');
        return;
      }
      router.push(`/clients/${json.data.id}`);
    } catch {
      setServerError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/clients">
          <Button variant="ghost" size="icon" className="text-charcoal hover:bg-sand/40 h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
            <span className="sr-only">Back to clients</span>
          </Button>
        </Link>
        <PageHeader title="New Client" />
      </div>

      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <ClientForm
        onSubmit={handleSubmit}
        submitLabel="Create Client"
        isLoading={isLoading}
      />
    </div>
  );
}
