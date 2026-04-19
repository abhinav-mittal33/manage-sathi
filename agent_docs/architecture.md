# Architecture
# Generated and maintained by Claude. Never edited manually.

## System Overview

Manage Sathi is a multi-tenant SaaS for Indian architecture firms (1-10 people) to track projects, drawings, site construction stages, site notes with photo proof, and invoicing — all with WhatsApp as the primary client communication channel. Currently deployed as single-tenant pilot for one firm; multi-tenancy is built-in via `firm_id` on every table.

## Component Diagram

```
Browser/Phone (PWA)
        │
        ├─── Next.js App Router (Vercel)
        │         │
        │         ├── /app/(app)/*     → Auth-protected pages
        │         ├── /app/login       → Login page (public)
        │         ├── /app/progress/*  → Client share pages (public)
        │         └── /app/api/v1/*    → API routes
        │                  │
        │                  ├── Drizzle ORM → Neon Postgres (Mumbai)
        │                  ├── @aws-sdk/client-s3 → Cloudflare R2
        │                  └── fetch → n8n webhooks
        │
        └─── IndexedDB (offline)
                  │
                  └── Sync Queue → /api/v1/site-notes/sync (when online)

External:
n8n (Oracle Cloud Mumbai VM)
        │
        └── Evolution API → WhatsApp Business (personal number)
                  │
                  └── Client's phone (receives messages, taps Approve)
                            │
                            └── Webhook reply → /api/v1/webhooks/n8n/drawing-approval
```

## Request Flow

### Authenticated page request
1. Browser hits any `/app/*` route
2. Next.js middleware reads `ms_session` httpOnly cookie
3. jose verifies JWT, extracts `{ userId, firmId, role }`
4. Injects `x-user-id`, `x-firm-id`, `x-user-role` headers
5. Page renders with server components pulling data from Neon via Drizzle

### Site note (offline → sync)
1. Site engineer opens `/site-diary/new` on phone (may be offline)
2. Fills note + takes photo → taps Save
3. Note + photo saved to IndexedDB with `syncStatus: 'pending'`
4. When online: sync trigger uploads photo to R2 (presigned URL), then POSTs to `/api/v1/site-notes/sync`
5. Server deduplicates by `(firm_id, local_id)`, saves to Postgres
6. Server fires `sendSiteNoteNotification()` → n8n webhook → WhatsApp to architect

### Drawing approval flow
1. Architect uploads drawing file (presigned URL → R2 direct upload), then marks submitted
2. Server calls `sendDrawingForApproval()` → n8n webhook
3. n8n sends WhatsApp to client with photo + "Reply APPROVE or tell me changes"
4. Client replies on WhatsApp
5. n8n parses reply, calls `/api/v1/webhooks/n8n/drawing-approval`
6. Server updates drawing status to `approved` or `revised`

## Module Map

| Path | Responsibility | Must NOT |
|------|---------------|----------|
| `src/app/api/v1/` | HTTP routing, auth check, input validation | Contain business logic |
| `src/lib/services/` | Business logic, orchestration | Access DB directly |
| `src/lib/dal/` | Drizzle queries only | Contain business logic |
| `src/lib/validations/` | Zod schemas for all inputs | Import from services |
| `src/lib/constants/` | Static config (stage hierarchy) | Be modified at runtime |
| `src/lib/offline/` | IndexedDB CRUD and sync queue | Call API routes directly |
| `src/components/` | UI components only | Contain business logic |
| `src/db/schema.ts` | All Drizzle table definitions | Contain queries |

## Key Design Decisions

1. **firm_id on every table** — RLS-ready from day 1. Even in single-tenant pilot, every query filters by firm_id from JWT.
2. **Stage hierarchy as constants, not DB config** — Stage structure is fixed per product version. Stored in `stage-hierarchy.ts`, seeded into DB on project create. Weight changes require a code + migration.
3. **Offline-first for site notes only** — Only site notes need offline. Drawings/invoices/clients are online-only (architect has laptop with internet).
4. **localId deduplication** — Client generates UUID before upload. Server has UNIQUE(firm_id, local_id) — duplicate POST is silently accepted (idempotent).
5. **R2 direct upload** — Client gets presigned PUT URL, uploads directly. Server never proxies file bytes. Only the final URL is stored in DB.
6. **WhatsApp via n8n (not Meta API)** — Evolution API + personal WhatsApp Business = $0 for pilot. For SaaS, swap credentials to Meta Cloud API.
7. **Public progress pages** — `/progress/[projectId]` has no auth. URL is the access token. Shows stage name + percent to clients.

## Boundaries

- Routes call services. Services call DAL. DAL calls Drizzle only.
- No business logic in route handlers.
- No DB queries in components.
- `getCurrentUser()` is called in route handlers — never in components.
- WhatsApp calls always in try/catch. Never let WhatsApp failure break the main flow.
- `firm_id` comes from JWT only — never from request body/query params.

## What NOT to Change Without Discussion

- `src/db/schema.ts` — all modules depend on this
- `src/lib/constants/stage-hierarchy.ts` — affects seeding, progress calculation, checklist UI, and SVG house progress
- `src/lib/offline/db.ts` — IndexedDB schema changes require version bump and migration
- The `(firm_id, local_id)` unique index on `site_notes` — removing breaks deduplication

## Planned but Not Built (MVP OUT)

- Razorpay payment links + webhook auto-reconciliation
- Bank SMS parsing (HDFC/ICICI/SBI formats)
- Legal approvals tracker (RERA, Fire NOC, TNCP, Building Permission)
- One-click phase upgrade with auto-invoice trigger
- GST auto-calculation (18%, SAC codes)
- Retainage tracking (5% hold per invoice)
- Change orders / variation billing
- Multi-tenancy billing + Stripe
- Hindi voice note transcription (Whisper)
- Labour attendance tracking
- PDF invoice generation
- Daily site report PDF (automated 6pm WhatsApp)
