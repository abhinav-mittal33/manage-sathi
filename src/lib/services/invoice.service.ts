import {
  listInvoices, getInvoiceById, insertInvoice, updateInvoice,
  softDeleteInvoice, markInvoiceSent, recordPayment, getNextInvoiceNumber,
  type InvoiceWithRelations,
} from '@/lib/dal/invoice.dal';
import { sendInvoice } from '@/lib/whatsapp';
import type { CreateInvoiceInput, UpdateInvoiceInput, RecordPaymentInput } from '@/lib/validations/invoice';

export type { InvoiceWithRelations };

export async function getInvoices(firmId: string, filters: { projectId?: string; status?: string } = {}) {
  return listInvoices(firmId, filters);
}

export async function getInvoice(id: string, firmId: string) {
  return getInvoiceById(id, firmId);
}

export async function nextInvoiceNumber(firmId: string) {
  return getNextInvoiceNumber(firmId);
}

export async function createInvoice(firmId: string, input: CreateInvoiceInput) {
  return insertInvoice(firmId, input);
}

export async function editInvoice(id: string, firmId: string, input: UpdateInvoiceInput) {
  return updateInvoice(id, firmId, input);
}

export async function deleteInvoice(id: string, firmId: string) {
  return softDeleteInvoice(id, firmId);
}

export async function sendInvoiceToClient(id: string, firmId: string) {
  const invoice = await getInvoiceById(id, firmId);
  if (!invoice) return null;

  const updated = await markInvoiceSent(id, firmId);

  try {
    if (invoice.clientPhone) {
      await sendInvoice(
        { id: invoice.id, invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount, description: invoice.description, dueDate: invoice.dueDate ?? null },
        { name: invoice.clientName ?? '', phone: invoice.clientPhone },
        invoice.projectName ?? ''
      );
    }
  } catch (err) {
    console.error('[sendInvoiceToClient] WhatsApp failed (non-fatal):', err);
  }

  return updated;
}

export async function recordInvoicePayment(id: string, firmId: string, input: RecordPaymentInput) {
  return recordPayment(id, firmId, input);
}
