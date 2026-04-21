'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId') ?? undefined;
  const [meta, setMeta] = useState<{ clientId?: string; projectName?: string }>({});

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/v1/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMeta({ clientId: d.data.clientId, projectName: d.data.name });
      });
  }, [projectId]);

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title="New Invoice" />
      <InvoiceForm projectId={projectId} clientId={meta.clientId} projectName={meta.projectName} />
    </div>
  );
}
