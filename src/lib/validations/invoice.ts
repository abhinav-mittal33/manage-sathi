import { z } from 'zod';

export const createInvoiceSchema = z.object({
  projectId: z.string().uuid(),
  clientId: z.string().uuid(),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  amount: z.number().positive('Amount must be positive'),
  taxPercent: z.number().min(0).max(100).default(18),
  stageKey: z.string().optional(),
  dueDate: z.string().date().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().omit({ projectId: true, clientId: true });

export const recordPaymentSchema = z.object({
  paidAmount: z.number().positive(),
  paymentMode: z.enum(['cash', 'upi', 'bank_transfer', 'cheque']),
  paymentReference: z.string().trim().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
