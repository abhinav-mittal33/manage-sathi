'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { SendInvoiceButton } from '@/components/invoices/send-invoice-button';
import { PaymentForm } from '@/components/invoices/payment-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { InvoiceWithRelations } from '@/lib/services/invoice.service';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/v1/invoices/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setInvoice(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete() {
    if (!confirm('Delete this draft invoice?')) return;
    await fetch(`/api/v1/invoices/${params.id}`, { method: 'DELETE' });
    router.push('/invoices');
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!invoice) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader title={invoice.invoiceNumber} description={invoice.projectName ?? undefined} />
      <InvoicePreview invoice={invoice} />

      <div className="flex flex-wrap gap-3">
        <SendInvoiceButton invoiceId={invoice.id} status={invoice.status} onSuccess={load} />
        {(invoice.status === 'sent') && !showPayment && (
          <Button variant="outline" onClick={() => setShowPayment(true)} className="min-h-[44px]">
            Record payment
          </Button>
        )}
        {invoice.status === 'draft' && (
          <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50 min-h-[44px]">
            Delete draft
          </Button>
        )}
      </div>

      {showPayment && (
        <div className="border border-sand rounded-lg p-4">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Record payment</h3>
          <PaymentForm invoiceId={invoice.id} totalAmount={invoice.totalAmount} onSuccess={() => { setShowPayment(false); load(); }} />
        </div>
      )}
    </div>
  );
}
