'use client';

import { useEffect, useState } from 'react';
import { InvoiceCard } from './invoice-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { InvoiceWithRelations } from '@/lib/services/invoice.service';

interface InvoiceListProps {
  projectId?: string;
}

export function InvoiceList({ projectId }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = projectId ? `/api/v1/invoices?projectId=${projectId}` : '/api/v1/invoices';
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.success) setInvoices(d.data); else setError('Failed to load'); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
    </div>
  );
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (invoices.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-8">No invoices yet.</p>
  );

  return (
    <div className="space-y-3">
      {invoices.map((inv) => <InvoiceCard key={inv.id} invoice={inv} />)}
    </div>
  );
}
