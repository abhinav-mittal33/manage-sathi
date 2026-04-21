'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface InvoiceFormProps {
  projectId?: string;
  clientId?: string;
  projectName?: string;
  onSuccess?: (id: string) => void;
}

export function InvoiceForm({ projectId, clientId, projectName, onSuccess }: InvoiceFormProps) {
  const router = useRouter();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [taxPercent, setTaxPercent] = useState('18');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived: recalculated whenever amount or taxPercent changes
  const amountNum = parseFloat(amount) || 0;
  const taxPercentNum = parseFloat(taxPercent) || 0;
  const taxAmount = (amountNum * taxPercentNum) / 100;
  const totalAmount = amountNum + taxAmount;

  useEffect(() => {
    async function fetchNextNumber() {
      try {
        const res = await fetch('/api/v1/invoices/next-number');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.data?.invoiceNumber) {
          setInvoiceNumber(data.data.invoiceNumber);
        }
      } catch {
        // Non-critical — display empty, user can proceed
      }
    }
    fetchNextNumber();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!projectId) {
      setError('Project is required.');
      return;
    }
    if (!clientId) {
      setError('Client is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!amount || amountNum <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          clientId,
          description: description.trim(),
          amount,
          taxPercent,
          dueDate: dueDate || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message ?? 'Failed to create invoice.');
        return;
      }

      if (onSuccess) {
        onSuccess(data.data.id);
      } else {
        router.push(`/invoices/${data.data.id}`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="bg-white border border-sand max-w-lg w-full">
      <CardHeader>
        <CardTitle className="text-charcoal">New Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice number — read-only, auto-assigned */}
          <div className="space-y-1">
            <Label htmlFor="invoice-number">Invoice Number</Label>
            <Input
              id="invoice-number"
              value={invoiceNumber}
              readOnly
              disabled
              placeholder="Generating…"
              className="bg-muted/40 cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="e.g. Foundation work — Phase 1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax-percent">GST %</Label>
              <Input
                id="tax-percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
            </div>
          </div>

          {/* Live calculation preview */}
          {amountNum > 0 && (
            <div className="rounded-lg bg-[#F8F6F1] border border-sand px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{amountNum.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST ({taxPercentNum}%)</span>
                <span>₹{taxAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-semibold text-charcoal border-t border-sand pt-1 mt-1">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="due-date">Due Date (optional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-sage text-white hover:bg-sage/90"
            style={{ backgroundColor: '#8A9A7B' }}
          >
            {isSubmitting ? 'Creating…' : 'Create Invoice'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
