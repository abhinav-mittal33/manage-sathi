import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  date,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Common columns helper ───────────────────────────────────────────────────
// Every table has: id, firm_id, created_at, updated_at, deleted_at (soft delete)

// ─── firms ────────────────────────────────────────────────────────────────────
export const firms = pgTable('firms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  ownerPhone: varchar('owner_phone', { length: 15 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── users ────────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 15 }).notNull(),
    email: varchar('email', { length: 255 }),
    role: varchar('role', { length: 20 }).notNull().default('architect'),
    // role: 'owner' | 'architect' | 'site_supervisor'
    pinHash: varchar('pin_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    firmPhoneUnique: uniqueIndex('users_firm_phone_unique').on(t.firmId, t.phone),
    firmIdIdx: index('users_firm_id_idx').on(t.firmId),
  })
);

// ─── clients ─────────────────────────────────────────────────────────────────
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 15 }).notNull(),
    email: varchar('email', { length: 255 }),
    gstin: varchar('gstin', { length: 15 }),
    pan: varchar('pan', { length: 10 }),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    firmIdIdx: index('clients_firm_id_idx').on(t.firmId),
    phoneIdx: index('clients_phone_idx').on(t.phone),
  })
);

// ─── projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    name: varchar('name', { length: 255 }).notNull(),
    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    pincode: varchar('pincode', { length: 6 }),
    currentPhase: varchar('current_phase', { length: 50 }).notNull().default('drawing'),
    // currentPhase: 'drawing' | 'building' | 'finishing' | 'electrical' | 'plumbing' | 'door_window' | 'railing' | 'complete'
    status: varchar('status', { length: 20 }).notNull().default('active'),
    // status: 'active' | 'on_hold' | 'completed' | 'cancelled'
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    firmIdIdx: index('projects_firm_id_idx').on(t.firmId),
    clientIdIdx: index('projects_client_id_idx').on(t.clientId),
  })
);

// ─── drawings ─────────────────────────────────────────────────────────────────
export const drawings = pgTable(
  'drawings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    drawingType: varchar('drawing_type', { length: 30 }).notNull(),
    // drawingType: 'brief' | 'planning' | 'structural' | 'mep_electrical' | 'mep_plumbing' | 'mep_hvac' | 'exterior_design' | 'interior_drawing'
    status: varchar('status', { length: 20 }).notNull().default('not_started'),
    // status: 'not_started' | 'submitted' | 'approved' | 'revised'
    version: integer('version').notNull().default(1),
    fileUrl: text('file_url'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: varchar('approved_by', { length: 255 }),
    notes: text('notes'),
    clientSuggestion: text('client_suggestion'),
    // Text the client sent with their YES/NO reply to a drawing approval ("yes but lighter shade")
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    projectTypeVersionUnique: uniqueIndex('drawings_project_type_version_unique').on(
      t.projectId,
      t.drawingType,
      t.version
    ),
    projectIdIdx: index('drawings_project_id_idx').on(t.projectId),
    firmIdIdx: index('drawings_firm_id_idx').on(t.firmId),
  })
);

// ─── site_stages ─────────────────────────────────────────────────────────────
export const siteStages = pgTable(
  'site_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    stageKey: varchar('stage_key', { length: 80 }).notNull(),
    // hierarchical key: 'building.foundation.excavation'
    displayName: varchar('display_name', { length: 100 }).notNull(),
    parentKey: varchar('parent_key', { length: 80 }),
    sortOrder: integer('sort_order').notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedById: uuid('completed_by_id').references(() => users.id),
    weight: decimal('weight', { precision: 5, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    projectStageKeyUnique: uniqueIndex('site_stages_project_stage_key_unique').on(
      t.projectId,
      t.stageKey
    ),
    projectIdIdx: index('site_stages_project_id_idx').on(t.projectId),
    firmIdIdx: index('site_stages_firm_id_idx').on(t.firmId),
  })
);

// ─── site_notes ───────────────────────────────────────────────────────────────
export const siteNotes = pgTable(
  'site_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    localId: varchar('local_id', { length: 36 }).notNull(),
    // UUID generated client-side in IndexedDB — prevents duplicate syncs
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    noteText: text('note_text'),
    photoUrl: text('photo_url'),
    photoLocalKey: varchar('photo_local_key', { length: 100 }),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    noteType: varchar('note_type', { length: 20 }).notNull().default('personal'),
    // noteType: 'site_visit' | 'personal' | 'approval_request'
    approvalStatus: varchar('approval_status', { length: 20 }),
    // approvalStatus: 'pending' | 'approved' | 'rejected' | NULL (only for approval_request)
    clientResponseText: text('client_response_text'),
    // Text the client sent with their YES/NO reply ("yes but use marble tiles")
    whatsappSent: boolean('whatsapp_sent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    firmLocalIdUnique: uniqueIndex('site_notes_firm_local_id_unique').on(t.firmId, t.localId),
    projectIdIdx: index('site_notes_project_id_idx').on(t.projectId),
    firmIdIdx: index('site_notes_firm_id_idx').on(t.firmId),
  })
);

// ─── reminders ────────────────────────────────────────────────────────────────
export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    title: varchar('title', { length: 255 }).notNull(),
    reminderType: varchar('reminder_type', { length: 30 }).notNull().default('general'),
    // reminderType: 'drawing_deadline' | 'project_completion' | 'client_meeting' | 'general'
    dueDate: date('due_date').notNull(),
    isCompleted: boolean('is_completed').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    projectIdIdx: index('reminders_project_id_idx').on(t.projectId),
    firmIdIdx: index('reminders_firm_id_idx').on(t.firmId),
    dueDateIdx: index('reminders_due_date_idx').on(t.dueDate),
  })
);

// ─── invoices ─────────────────────────────────────────────────────────────────
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    invoiceNumber: varchar('invoice_number', { length: 30 }).notNull(),
    // Format: MS-2024-001
    stageKey: varchar('stage_key', { length: 80 }),
    description: text('description').notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    taxPercent: decimal('tax_percent', { precision: 5, scale: 2 }).notNull().default('18.00'),
    taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // status: 'draft' | 'sent' | 'paid' | 'cancelled'
    dueDate: date('due_date'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    paidAmount: decimal('paid_amount', { precision: 12, scale: 2 }),
    paymentMode: varchar('payment_mode', { length: 30 }),
    // paymentMode: 'cash' | 'upi' | 'bank_transfer' | 'cheque'
    paymentReference: varchar('payment_reference', { length: 100 }),
    whatsappSent: boolean('whatsapp_sent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    firmInvoiceNumberUnique: uniqueIndex('invoices_firm_invoice_number_unique').on(
      t.firmId,
      t.invoiceNumber
    ),
    projectIdIdx: index('invoices_project_id_idx').on(t.projectId),
    firmIdIdx: index('invoices_firm_id_idx').on(t.firmId),
  })
);

// ─── whatsapp_messages ────────────────────────────────────────────────────────
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .notNull()
      .references(() => firms.id),
    direction: varchar('direction', { length: 10 }).notNull(),
    // direction: 'outbound' | 'inbound'
    toPhone: varchar('to_phone', { length: 15 }).notNull(),
    fromPhone: varchar('from_phone', { length: 15 }),
    messageType: varchar('message_type', { length: 30 }).notNull(),
    // messageType: 'drawing_approval' | 'site_note' | 'invoice' | 'general'
    referenceId: uuid('reference_id'),
    referenceType: varchar('reference_type', { length: 30 }),
    payload: jsonb('payload'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
    n8nExecutionId: varchar('n8n_execution_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    firmIdIdx: index('whatsapp_messages_firm_id_idx').on(t.firmId),
  })
);

// ─── Relations ────────────────────────────────────────────────────────────────
export const firmsRelations = relations(firms, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one }) => ({
  firm: one(firms, { fields: [users.firmId], references: [firms.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  firm: one(firms, { fields: [clients.firmId], references: [firms.id] }),
  projects: many(projects),
  invoices: many(invoices),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  firm: one(firms, { fields: [projects.firmId], references: [firms.id] }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  drawings: many(drawings),
  siteStages: many(siteStages),
  siteNotes: many(siteNotes),
  invoices: many(invoices),
  reminders: many(reminders),
}));

export const drawingsRelations = relations(drawings, ({ one }) => ({
  project: one(projects, { fields: [drawings.projectId], references: [projects.id] }),
  firm: one(firms, { fields: [drawings.firmId], references: [firms.id] }),
}));

export const siteStagesRelations = relations(siteStages, ({ one }) => ({
  project: one(projects, { fields: [siteStages.projectId], references: [projects.id] }),
  firm: one(firms, { fields: [siteStages.firmId], references: [firms.id] }),
  completedBy: one(users, { fields: [siteStages.completedById], references: [users.id] }),
}));

export const siteNotesRelations = relations(siteNotes, ({ one }) => ({
  project: one(projects, { fields: [siteNotes.projectId], references: [projects.id] }),
  firm: one(firms, { fields: [siteNotes.firmId], references: [firms.id] }),
  author: one(users, { fields: [siteNotes.authorId], references: [users.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  firm: one(firms, { fields: [invoices.firmId], references: [firms.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  project: one(projects, { fields: [reminders.projectId], references: [projects.id] }),
  firm: one(firms, { fields: [reminders.firmId], references: [firms.id] }),
}));
