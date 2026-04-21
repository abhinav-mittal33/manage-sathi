import { formatCurrency, formatDate } from '@/lib/utils';
import type { InvoiceWithRelations } from '@/lib/services/invoice.service';

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank Transfer', cheque: 'Cheque',
};

interface InvoicePreviewProps {
  invoice: InvoiceWithRelations;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const subtotal = parseFloat(invoice.amount);
  const tax = parseFloat(invoice.taxAmount);
  const total = parseFloat(invoice.totalAmount);

  return (
    <div className="bg-white border border-sand rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice</p>
          <p className="text-xl font-bold text-charcoal font-mono">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>{formatDate(invoice.createdAt)}</p>
          {invoice.dueDate && <p>Due: {formatDate(invoice.dueDate)}</p>}
        </div>
      </div>

      {/* Client / Project */}
      {(invoice.clientName || invoice.projectName) && (
        <div className="border-t border-sand pt-4 text-sm">
          {invoice.clientName && <p className="font-medium text-charcoal">{invoice.clientName}</p>}
          {invoice.projectName && <p className="text-muted-foreground">{invoice.projectName}</p>}
        </div>
      )}

      {/* Description */}
      <div className="border-t border-sand pt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Description</p>
        <p className="text-sm text-charcoal">{invoice.description}</p>
      </div>

      {/* Amounts */}
      <div className="border-t border-sand pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-charcoal">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">GST ({invoice.taxPercent}%)</span>
          <span className="text-charcoal">{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between font-semibold text-base border-t border-sand pt-2">
          <span className="text-charcoal">Total</span>
          <span className="text-charcoal">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Payment info */}
      {invoice.status === 'paid' && invoice.paidAt && (
        <div className="border-t border-sage/30 bg-sage/5 rounded p-3 text-sm">
          <p className="font-medium text-sage">Payment received</p>
          <p className="text-charcoal mt-0.5">
            {formatCurrency(parseFloat(invoice.paidAmount ?? '0'))}
            {invoice.paymentMode && ` · ${PAYMENT_MODE_LABELS[invoice.paymentMode] ?? invoice.paymentMode}`}
            {invoice.paymentReference && ` · Ref: ${invoice.paymentReference}`}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">{formatDate(invoice.paidAt)}</p>
        </div>
      )}
    </div>
  );
}
