# Architecture
# Generated and maintained by Claude. Never edited manually.

## System Overview

Manage Sathi is a Next.js 14 App Router PWA for Indian architecture firms. Single-tenant pilot for 1 firm, multi-tenant-ready schema.

```
Browser (PWA)
  │
  ├─ Online  → Next.js API Routes → Drizzle ORM → Neon Postgres
  │                               → Cloudflare R2 (presigned URLs)
  │                               → n8n webhook → Evolution API → WhatsApp
  │
  └─ Offline → IndexedDB (idb)
               └─ On reconnect → /api/v1/site-notes/sync → Neon + R2
```

## Build Status (as of 2026-04-20)

| Phase | What | Status |
|-------|------|--------|
| 0 | Config + install + UI shell + layout + dashboard | ✓ Complete |
| 1 | Auth (login/logout) + Client CRUD + Project CRUD | ✓ Complete |
| 2 | Drawing tracker (8 types, upload, status, versioning) | ✓ Complete |
| 3 | Site stages checklist (31 leaf nodes, progress %) | ✓ Complete |
| 4 | Site notes with offline + photo + sync | ✓ Complete |
| 5 | Drawing approval WhatsApp flow (n8n webhook) | ✓ Complete |
| 6 | Progress view (public share link + architect view) | ✓ Complete |
| 7 | Invoicing (create, send, payment, WhatsApp) | ✓ Complete |

## All API Routes

### Auth (no JWT required)
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`

### Clients (JWT required)
- GET/POST `/api/v1/clients`
- GET/PUT/DELETE `/api/v1/clients/[id]`

### Projects (JWT required)
- GET/POST `/api/v1/projects`
- GET/PUT/DELETE `/api/v1/projects/[id]`
- GET `/api/v1/projects/[id]/progress` ← PUBLIC (no auth)

### Drawings (JWT required)
- GET/POST `/api/v1/projects/[id]/drawings`
- GET/PUT `/api/v1/projects/[id]/drawings/[drawingId]`
- POST `/api/v1/projects/[id]/drawings/[drawingId]/upload`
- POST `/api/v1/projects/[id]/drawings/[drawingId]/send-approval`

### Site Stages (JWT required)
- GET `/api/v1/projects/[id]/stages`
- PUT `/api/v1/projects/[id]/stages/[stageId]`
- GET `/api/v1/projects/[id]/stages/progress`

### Site Notes (JWT required)
- GET/POST `/api/v1/site-notes`
- POST `/api/v1/site-notes/sync` ← idempotent batch sync
- GET `/api/v1/site-notes/[id]`

### Invoices (JWT required)
- GET/POST `/api/v1/invoices`
- GET `/api/v1/invoices/next-number`
- GET/PUT/DELETE `/api/v1/invoices/[id]`
- POST `/api/v1/invoices/[id]/send`
- POST `/api/v1/invoices/[id]/payment`

### Webhooks (X-Webhook-Secret header, no JWT)
- POST `/api/v1/webhooks/n8n`
- POST `/api/v1/webhooks/n8n/drawing-approval`

## All Pages

### Public (no auth)
- `/login` — phone + PIN login form
- `/progress/[projectId]` — client share link, server-rendered

### Protected (JWT cookie required)
- `/(app)/dashboard` — stats overview
- `/(app)/clients` — client list
- `/(app)/clients/new` — create client
- `/(app)/clients/[id]` — client detail
- `/(app)/clients/[id]/edit` — edit client
- `/(app)/projects/[id]` — project detail (nav hub)
- `/(app)/projects/[id]/edit` — edit project
- `/(app)/projects/[id]/drawings` — 8-card drawing grid
- `/(app)/projects/[id]/stages` — accordion checklist
- `/(app)/projects/[id]/notes` — site notes list
- `/(app)/projects/[id]/notes/new` — capture note (offline-first)
- `/(app)/projects/[id]/invoices` — project invoices
- `/(app)/projects/[id]/progress` — progress view + share button
- `/(app)/site-diary` — all notes across projects
- `/(app)/site-diary/new` — capture note from diary
- `/(app)/invoices` — all invoices
- `/(app)/invoices/new` — create invoice
- `/(app)/invoices/[id]` — invoice detail + send + payment

## Key File Map

| Concern | Files |
|---------|-------|
| DB schema | `src/db/schema.ts` |
| DB client | `src/db/index.ts` |
| Seed data | `src/db/seed.ts` |
| Auth middleware | `src/middleware.ts` |
| Auth helpers | `src/lib/auth.ts` |
| Stage hierarchy | `src/lib/constants/stage-hierarchy.ts` |
| Progress calc | `src/lib/services/progress.service.ts` |
| WhatsApp | `src/lib/whatsapp.ts` |
| R2 storage | `src/lib/storage.ts` |
| Offline IDB | `src/lib/offline/db.ts` |
| Offline sync | `src/lib/offline/sync.ts` |

## Request Flow: Auth

```
Browser → POST /api/v1/auth/login { phone, pin }
        → bcrypt.compare(pin, user.pinHash)
        → jose.SignJWT({ sub, firmId, role })
        → Set-Cookie: ms_session (httpOnly, lax, 7d)
        → All subsequent requests: middleware reads cookie → injects x-firm-id/x-user-id headers
        → Route handlers call requireAuth() → reads headers → returns { userId, firmId, role }
```

## Request Flow: Offline Site Note Sync

```
Offline: capture note → saveSiteNoteOffline(IDB) + savePhotoOffline(IDB)
Online:  syncPendingNotes()
         → for each pending note with photo:
             GET presigned upload URL from /api/v1/site-notes (storage.ts)
             PUT photo binary to R2
         → POST /api/v1/site-notes/sync [array of notes]
             Server: for each note, check (firmId, localId) unique — skip if exists
             Server: insert note, call sendSiteNoteNotification() in try/catch
         → markNoteSynced(localId) in IDB
```

## Request Flow: Drawing Approval

```
Architect uploads drawing → PUT /drawings/[id] { action:'submit' }
  → status = 'submitted'
  → sendDrawingForApproval() → n8n webhook → Evolution API → WhatsApp to client

Client replies on WhatsApp → n8n captures reply → POST /webhooks/n8n/drawing-approval
  action='approved'       → drawing.status = 'approved'
  action='changes_requested' → drawing.status = 'revised'

Architect sees revision → PUT /drawings/[id] { action:'revise' }
  → inserts new row: same drawingType, version+1, status='not_started'
  → old row preserved for audit trail
```

## Key Invariants

1. **firmId always from JWT** — never from request body. All DAL queries scope by firmId.
2. **Progress denominator = 92.5** — sum of all leaf weights. Never hardcode 100.
3. **Parent stage nodes** — weight=0, cannot be toggled. Leaf nodes only (weight > 0).
4. **Drawing revisions** — new row with version+1, old row immutable.
5. **Offline sync** — idempotent by (firmId, localId). Second sync always returns skipped.
6. **WhatsApp calls** — always try/catch, failure never breaks main request.
7. **Soft deletes** — deleted_at timestamp only. Never hard delete.
8. **Invoice number** — format MS-YYYY-NNN, sequential per firm per year.
9. **Tax** — computed server-side from amount × taxPercent. Client-provided taxAmount ignored.
