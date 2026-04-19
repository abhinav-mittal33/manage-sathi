# Database
# Generated and maintained by Claude. Updated as schema evolves.

## Engine

PostgreSQL 16 via Neon (serverless, free tier, Mumbai region)

## Connection

```bash
# Dev
DATABASE_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/manage_sathi?sslmode=require

# Neon wakes in ~500ms after idle. Fine for pilot.
```

Env var: `DATABASE_URL`

## ORM

Drizzle ORM with `drizzle-orm/neon-http` (serverless driver).
- Schema: `src/db/schema.ts`
- Client: `src/db/index.ts` — exports `db` singleton
- Migrations: `drizzle-kit generate` → `drizzle-kit push`
- Queries: DAL files in `src/lib/dal/`

## Schema

All tables have `firm_id UUID` as first-class tenant isolation column. Soft deletes via `deleted_at` where applicable.

### firms
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom() |
| name | varchar(255) | firm name |
| slug | varchar(100) | unique, URL-safe |
| owner_phone | varchar(15) | primary contact |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| name | varchar(255) | |
| phone | varchar(15) | |
| email | varchar(255) | nullable |
| role | varchar(20) | 'owner' \| 'architect' \| 'site_supervisor' |
| pin_hash | varchar(255) | bcrypt hash of 4-6 digit PIN |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

Indexes: `users_firm_phone_unique` (firm_id, phone), `users_firm_id_idx` (firm_id)

### clients
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| name | varchar(255) | |
| phone | varchar(15) | |
| email | varchar(255) | nullable |
| gstin | varchar(15) | nullable |
| pan | varchar(10) | nullable |
| address_line1 | text | nullable |
| address_line2 | text | nullable |
| city | varchar(100) | nullable |
| state | varchar(100) | nullable |
| pincode | varchar(6) | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| client_id | uuid FK → clients | |
| name | varchar(255) | |
| address_line1/2, city, state, pincode | various | nullable |
| current_phase | varchar(50) | 'drawing' \| 'building' \| 'finishing' \| 'electrical' \| 'plumbing' \| 'door_window' \| 'railing' \| 'complete' |
| status | varchar(20) | 'active' \| 'on_hold' \| 'completed' \| 'cancelled' |
| latitude, longitude | decimal(10,7) | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

### drawings
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| project_id | uuid FK → projects | |
| drawing_type | varchar(30) | 'brief' \| 'planning' \| 'structural' \| 'mep_electrical' \| 'mep_plumbing' \| 'mep_hvac' \| 'exterior_design' \| 'interior_drawing' |
| status | varchar(20) | 'not_started' \| 'submitted' \| 'approved' \| 'revised' |
| version | integer | default 1, increments on revise |
| file_url | text | R2 URL, nullable |
| submitted_at | timestamptz | nullable |
| approved_at | timestamptz | nullable |
| approved_by | varchar(255) | nullable — WhatsApp message ID or user name |
| notes | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

Unique index: `(project_id, drawing_type, version)`

### site_stages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| project_id | uuid FK → projects | |
| stage_key | varchar(80) | hierarchical: 'building.foundation.excavation' |
| display_name | varchar(100) | human-readable: 'Excavation' |
| parent_key | varchar(80) | nullable: 'building.foundation' |
| sort_order | integer | within parent |
| is_completed | boolean | default false |
| completed_at | timestamptz | nullable |
| completed_by_id | uuid FK → users | nullable |
| weight | decimal(5,2) | contribution to overall progress |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique index: `(project_id, stage_key)`
Note: Only leaf nodes have weight > 0. Completion of parent nodes is COMPUTED from children, not stored.

### site_notes
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| project_id | uuid FK → projects | |
| local_id | varchar(36) | client-generated UUID for deduplication |
| author_id | uuid FK → users | |
| note_text | text | nullable |
| photo_url | text | R2 URL after upload, nullable |
| photo_local_key | varchar(100) | IndexedDB photo store key, nullable |
| latitude | decimal(10,7) | nullable |
| longitude | decimal(10,7) | nullable |
| captured_at | timestamptz | device time when note was created |
| synced_at | timestamptz | server time when synced, nullable |
| whatsapp_sent | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

Unique index: `(firm_id, local_id)` — deduplication key for offline sync
Note: `stageKey` is NOT stored on site_notes in current schema. Notes are project-level, not stage-level. Stage filtering is by projectId + optional stageKey in query params.

### invoices
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| project_id | uuid FK → projects | |
| client_id | uuid FK → clients | |
| invoice_number | varchar(30) | format: MS-2024-001, unique per firm |
| stage_key | varchar(80) | optional: which stage triggered this |
| description | text | |
| amount | decimal(12,2) | pre-tax |
| tax_percent | decimal(5,2) | default 18.00 |
| tax_amount | decimal(12,2) | |
| total_amount | decimal(12,2) | |
| status | varchar(20) | 'draft' \| 'sent' \| 'paid' \| 'cancelled' |
| due_date | date | nullable |
| paid_at | timestamptz | nullable |
| paid_amount | decimal(12,2) | nullable (for partial payments) |
| payment_mode | varchar(30) | 'cash' \| 'upi' \| 'bank_transfer' \| 'cheque' |
| payment_reference | varchar(100) | nullable |
| whatsapp_sent | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

Unique index: `(firm_id, invoice_number)`

### whatsapp_messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| firm_id | uuid FK → firms | |
| direction | varchar(10) | 'outbound' \| 'inbound' |
| to_phone | varchar(15) | |
| from_phone | varchar(15) | nullable |
| message_type | varchar(30) | 'drawing_approval' \| 'site_note' \| 'invoice' \| 'general' |
| reference_id | uuid | nullable — drawing/invoice/note ID |
| reference_type | varchar(30) | nullable |
| payload | jsonb | full message payload |
| status | varchar(20) | 'pending' \| 'sent' \| 'delivered' \| 'read' \| 'failed' |
| n8n_execution_id | varchar(100) | nullable |
| created_at | timestamptz | |

## Migration Commands

```bash
# Create new migration file
npm run db:generate

# Push schema changes directly (dev only)
npm run db:push

# Drizzle Studio
npm run db:studio
```

## Seeding

`src/db/seed.ts` — run with `npm run db:seed`

Seeds:
1. One firm: `{ name: 'Demo Architecture', slug: 'demo', ownerPhone: '+919999999999' }`
2. One owner user: `{ name: 'Demo Architect', phone: '+919999999999', role: 'owner', pin: '1234' }`
3. One client: `{ name: 'Sharma Villa', phone: '+919876543210' }`
4. One project linked to client, status active
5. All 31 site_stage rows (leaf nodes only with weights, parent nodes as navigation entries) for the project

## Rules

- Never delete a column in the same migration that stops writing to it.
- Never run migrations on prod without a tested rollback.
- All queries use parameterized Drizzle calls — no raw SQL with user input.
- `firm_id` filter on every query — DAL layer must enforce this.
- No `SELECT *` — always specify columns.

## Gotchas

- `site_stages` only stores leaf nodes with weights. Progress is calculated by summing weights of `is_completed = true` rows.
- `drawings` has a unique index on `(project_id, drawing_type, version)`. On revise: create new row with `version + 1`, don't update the old row.
- `invoice_number` format is `MS-YYYY-NNN`. Get next number via `/api/v1/invoices/next-number`.
- Neon free tier pauses after inactivity. First request after pause takes ~500ms extra. Build retry logic in DB client.
