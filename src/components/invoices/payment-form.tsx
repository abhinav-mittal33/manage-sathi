'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordPaymentSchema, type RecordPaymentInput } from '@/lib/validations/invoice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaymentFormProps {
  invoiceId: string;
  totalAmount: string;
  onSuccess: () => void;
}

export function PaymentForm({ invoiceId, totalAmount, onSuccess }: PaymentFormProps) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { paidAmount: parseFloat(totalAmount), paymentMode: 'upi' },
  });

  const paymentMode = watch('paymentMode');

  async function onSubmit(data: RecordPaymentInput) {
    setError(null);
    const res = await fetch(`/api/v1/invoices/${invoiceId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setError(json?.error?.message ?? 'Failed to record payment'); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="paidAmount">Amount received (₹)</Label>
        <Input id="paidAmount" type="number" step="0.01" {...register('paidAmount', { valueAsNumber: true })} />
        {errors.paidAmount && <p className="text-xs text-red-600">{errors.paidAmount.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Payment mode</Label>
        <Select value={paymentMode} onValueChange={(v) => { if (v) setValue('paymentMode', v as RecordPaymentInput['paymentMode']); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="paymentReference">Reference / UTR (optional)</Label>
        <Input id="paymentReference" placeholder="UPI ref or cheque number" {...register('paymentReference')} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full bg-sage hover:bg-sage/90 text-white min-h-[44px]">
        {isSubmitting ? 'Recording…' : 'Record payment'}
      </Button>
    </form>
  );
}
