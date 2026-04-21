import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, projects, clients } from '@/db/schema';
import type { CreateInvoiceInput, UpdateInvoiceInput, RecordPaymentInput } from '@/lib/validations/invoice';

export type InvoiceRow = typeof invoices.$inferSelect;
export type InvoiceWithRelations = InvoiceRow & {
  projectName: string | null;
  clientName: string | null;
  clientPhone: string | null;
};

export async function getNextInvoiceNumber(firmId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MS-${year}-`;
  const [row] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(and(eq(invoices.firmId, firmId), sql`${invoices.invoiceNumber} LIKE ${prefix + '%'}`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  const last = row?.invoiceNumber;
  const seq = last ? parseInt(last.split('-')[2] ?? '0', 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

export async function listInvoices(
  firmId: string,
  filters: { projectId?: string; status?: string; limit?: number; cursor?: string } = {}
): Promise<InvoiceWithRelations[]> {
  const limit = Math.min(filters.limit ?? 20, 100);
  const conditions = [eq(invoices.firmId, firmId), isNull(invoices.deletedAt)];
  if (filters.projectId) conditions.push(eq(invoices.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(invoices.status, filters.status));

  const rows = await db
    .select({
      id: invoices.id, firmId: invoices.firmId, projectId: invoices.projectId,
      clientId: invoices.clientId, invoiceNumber: invoices.invoiceNumber,
      stageKey: invoices.stageKey, description: invoices.description,
      amount: invoices.amount, taxPercent: invoices.taxPercent, taxAmount: invoices.taxAmount,
      totalAmount: invoices.totalAmount, status: invoices.status, dueDate: invoices.dueDate,
      paidAt: invoices.paidAt, paidAmount: invoices.paidAmount, paymentMode: invoices.paymentMode,
      paymentReference: invoices.paymentReference, whatsappSent: invoices.whatsappSent,
      createdAt: invoices.createdAt, updatedAt: invoices.updatedAt, deletedAt: invoices.deletedAt,
      projectName: projects.name,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
    .from(invoices)
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt))
    .limit(limit);

  return rows as InvoiceWithRelations[];
}

export async function getInvoiceById(id: string, firmId: string): Promise<InvoiceWithRelations | null> {
  const [row] = await db
    .select({
      id: invoices.id, firmId: invoices.firmId, projectId: invoices.projectId,
      clientId: invoices.clientId, invoiceNumber: invoices.invoiceNumber,
      stageKey: invoices.stageKey, description: invoices.description,
      amount: invoices.amount, taxPercent: invoices.taxPercent, taxAmount: invoices.taxAmount,
      totalAmount: invoices.totalAmount, status: invoices.status, dueDate: invoices.dueDate,
      paidAt: invoices.paidAt, paidAmount: invoices.paidAmount, paymentMode: invoices.paymentMode,
      paymentReference: invoices.paymentReference, whatsappSent: invoices.whatsappSent,
      createdAt: invoices.createdAt, updatedAt: invoices.updatedAt, deletedAt: invoices.deletedAt,
      projectName: projects.name,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
    .from(invoices)
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.id, id), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
    .limit(1);

  return (row as InvoiceWithRelations) ?? null;
}

export async function insertInvoice(firmId: string, input: CreateInvoiceInput): Promise<InvoiceRow> {
  const invoiceNumber = await getNextInvoiceNumber(firmId);
  const taxAmount = (input.amount * (input.taxPercent ?? 18)) / 100;
  const totalAmount = input.amount + taxAmount;

  const [row] = await db.insert(invoices).values({
    firmId,
    projectId: input.projectId,
    clientId: input.clientId,
    invoiceNumber,
    description: input.description,
    stageKey: input.stageKey ?? null,
    amount: String(input.amount),
    taxPercent: String(input.taxPercent ?? 18),
    taxAmount: String(taxAmount.toFixed(2)),
    totalAmount: String(totalAmount.toFixed(2)),
    status: 'draft',
    dueDate: input.dueDate ?? null,
  }).returning();
  return row;
}

export async function updateInvoice(id: string, firmId: string, input: UpdateInvoiceInput): Promise<InvoiceRow | null> {
  const vals: Partial<typeof invoices.$inferInsert> = { updatedAt: new Date() };
  if (input.description !== undefined) vals.description = input.description;
  if (input.stageKey !== undefined) vals.stageKey = input.stageKey;
  if (input.dueDate !== undefined) vals.dueDate = input.dueDate ?? null;
  if (input.amount !== undefined || input.taxPercent !== undefined) {
    const current = await getInvoiceById(id, firmId);
    if (!current) return null;
    const amt = input.amount ?? parseFloat(current.amount);
    const tax = input.taxPercent ?? parseFloat(current.taxPercent);
    const taxAmt = (amt * tax) / 100;
    vals.amount = String(amt);
    vals.taxPercent = String(tax);
    vals.taxAmount = String(taxAmt.toFixed(2));
    vals.totalAmount = String((amt + taxAmt).toFixed(2));
  }

  const [row] = await db.update(invoices).set(vals)
    .where(and(eq(invoices.id, id), eq(invoices.firmId, firmId), eq(invoices.status, 'draft'), isNull(invoices.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteInvoice(id: string, firmId: string): Promise<boolean> {
  const [row] = await db.update(invoices)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.firmId, firmId), eq(invoices.status, 'draft'), isNull(invoices.deletedAt)))
    .returning({ id: invoices.id });
  return !!row;
}

export async function markInvoiceSent(id: string, firmId: string): Promise<InvoiceRow | null> {
  const [row] = await db.update(invoices)
    .set({ status: 'sent', whatsappSent: true, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
    .returning();
  return row ?? null;
}

export async function recordPayment(id: string, firmId: string, input: RecordPaymentInput): Promise<InvoiceRow | null> {
  const [row] = await db.update(invoices)
    .set({
      status: 'paid',
      paidAt: new Date(),
      paidAmount: String(input.paidAmount),
      paymentMode: input.paymentMode,
      paymentReference: input.paymentReference ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.firmId, firmId), isNull(invoices.deletedAt)))
    .returning();
  return row ?? null;
}
