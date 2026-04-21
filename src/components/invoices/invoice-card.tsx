'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { InvoiceWithRelations } from '@/lib/services/invoice.service';

const STATUS_CONFIG = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-muted' },
  sent: { label: 'Sent', className: 'bg-sand text-charcoal border-sand' },
  paid: { label: 'Paid', className: 'bg-sage text-white border-sage' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600 border-red-200' },
} as const;

interface InvoiceCardProps {
  invoice: InvoiceWithRelations;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const cfg = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
  return (
    <Link href={`/invoices/${invoice.id}`} className="block group">
      <Card className="bg-white border border-sand hover:border-sage transition-colors duration-150">
        <CardContent className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-charcoal">{invoice.invoiceNumber}</span>
                <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>
              </div>
              <p className="text-sm text-charcoal mt-0.5 truncate">{invoice.description}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {invoice.clientName && <span>{invoice.clientName}</span>}
                {invoice.projectName && <span>· {invoice.projectName}</span>}
                {invoice.dueDate && <span>Due {formatDate(invoice.dueDate)}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-charcoal">{formatCurrency(parseFloat(invoice.totalAmount))}</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1 group-hover:text-sage transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
