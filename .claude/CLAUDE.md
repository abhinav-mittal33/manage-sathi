# Project CLAUDE.md

## Project

**Name**: Manage Sathi
**Purpose**: SaaS for Indian architecture firms (1-10 people) — track projects, drawings, site stages, site notes, and invoicing with WhatsApp-native client communication.
**MVP scope**:
- IN: Project + client CRUD, drawing tracker (8 types) with WhatsApp approval flow, site stages with exact 7-category checklist hierarchy, site notes with offline photo capture → WhatsApp to architect, client progress view (stage cards showing current stage name + %), basic invoicing (manual create + send via WhatsApp)
- OUT: Razorpay integration, bank SMS parsing, legal approvals tracker (RERA/Fire NOC), GST auto-calculation, retainage tracking, multi-tenancy billing, Hindi voice transcription, one-click phase auto-invoice, change orders, labour attendance
**Status**: MVP COMPLETE (2026-04-20) — All 8 phases built and TypeScript-clean. Ready for pilot testing.

## Stack

- **Language + version**: TypeScript 5.5, Node.js 20
- **Backend framework**: Next.js 14 App Router (API routes in src/app/api/)
- **Database**: Neon Postgres (free tier) via Drizzle ORM
- **Frontend**: Next.js 14 PWA, shadcn/ui, Tailwind CSS
- **Package manager**: npm
- **Test runner**: not set up yet
- **Key libraries**: drizzle-orm, @neondatabase/serverless, jose (JWT), bcryptjs (PIN hash), idb (IndexedDB offline), zod, react-hook-form, @hookform/resolvers, @aws-sdk/client-s3 (for R2), lucide-react, class-variance-authority, clsx, tailwind-merge
- **Deployment target**: Vercel (frontend) + Neon (DB) + Cloudflare R2 (files/photos)
- **WhatsApp automation**: n8n self-hosted on Oracle Cloud Mumbai free VM, Evolution API node for personal WhatsApp Business number

## Color Palette (STRICT — DO NOT DEVIATE)

```
Background: Plaster White  #F8F6F1
Primary:    Sage Green     #8A9A7B   (completed, active)
Secondary:  Sand           #D1BFA7   (in-progress, subtle)
Text:       Charcoal       #2C2A26
```

High-contrast UI for sunlight readability. No harsh blues/oranges.

## Folder Structure

```
manage-sathi/
  package.json
  tsconfig.json
  next.config.mjs
  tailwind.config.ts
  postcss.config.mjs
  drizzle.config.ts
  .env.example
  .env.local                        (gitignored)
  .gitignore
  public/
    manifest.json                   (PWA manifest)
    icons/
      icon-192.png
      icon-512.png
    sw.js                           (service worker)
  src/
    app/
      globals.css
      layout.tsx                    (root layout: fonts, CSS vars)
      (app)/                        (auth-protected route group)
        layout.tsx                  (sidebar + mobile nav)
        page.tsx                    (redirect to /dashboard)
        dashboard/
          page.tsx
        clients/
          page.tsx
          new/page.tsx
          [id]/page.tsx
          [id]/edit/page.tsx
        projects/
          [id]/page.tsx
          [id]/edit/page.tsx
          [id]/drawings/page.tsx
          [id]/stages/page.tsx
          [id]/notes/page.tsx
          [id]/invoices/page.tsx
          [id]/progress/page.tsx
        site-diary/
          page.tsx
          new/page.tsx
        invoices/
          page.tsx
          new/page.tsx
          [id]/page.tsx
        progress/
          [projectId]/page.tsx      (PUBLIC — no auth, client share link)
      login/
        page.tsx
      api/
        v1/
          auth/login/route.ts
          auth/logout/route.ts
          clients/route.ts
          clients/[id]/route.ts
          projects/route.ts
          projects/[id]/route.ts
          projects/[id]/drawings/route.ts
          projects/[id]/drawings/[drawingId]/route.ts
          projects/[id]/drawings/[drawingId]/upload/route.ts
          projects/[id]/stages/route.ts
          projects/[id]/stages/[stageId]/route.ts
          projects/[id]/stages/progress/route.ts
          projects/[id]/progress/route.ts
          site-notes/route.ts
          site-notes/sync/route.ts
          site-notes/[id]/route.ts
          invoices/route.ts
          invoices/[id]/route.ts
          invoices/[id]/send/route.ts
          invoices/[id]/payment/route.ts
          invoices/next-number/route.ts
          webhooks/n8n/route.ts
          webhooks/n8n/drawing-approval/route.ts
    components/
      ui/                           (shadcn components)
      layout/
        sidebar.tsx
        mobile-nav.tsx
        page-header.tsx
      clients/
        client-form.tsx
        client-card.tsx
        client-list.tsx
      projects/
        project-form.tsx
        project-card.tsx
        project-status-badge.tsx
      drawings/
        drawing-type-card.tsx
        drawing-status-flow.tsx
        drawing-upload-dialog.tsx
        drawing-grid.tsx
      stages/
        stage-checklist.tsx
        stage-category.tsx
        stage-item.tsx
        stage-progress-bar.tsx
      site-notes/
        note-capture-form.tsx
        note-card.tsx
        note-list.tsx
        sync-status-indicator.tsx
        camera-button.tsx
      invoices/
        invoice-form.tsx
        invoice-card.tsx
        invoice-list.tsx
        invoice-preview.tsx
        payment-form.tsx
        send-invoice-button.tsx
      progress/
        progress-summary.tsx
        stage-detail-list.tsx
        share-progress-button.tsx
    db/
      index.ts                      (Drizzle + Neon client)
      schema.ts                     (all tables)
      seed.ts                       (demo data seeder)
    lib/
      utils.ts                      (cn() helper)
      auth.ts                       (getCurrentUser, requireAuth)
      whatsapp.ts                   (n8n webhook caller)
      storage.ts                    (R2 presigned URL generation)
      constants/
        stage-hierarchy.ts          (CRITICAL: all stages, weights, keys)
      offline/
        db.ts                       (IndexedDB schema via idb)
        sync.ts                     (sync queue: IDB → API)
        photo-store.ts              (photo blob storage in IDB)
      validations/
        client.ts
        project.ts
        drawing.ts
        stage.ts
        site-note.ts
        invoice.ts
      services/
        client.service.ts
        project.service.ts
        drawing.service.ts
        stage.service.ts
        site-note.service.ts
        invoice.service.ts
        progress.service.ts
      dal/
        client.dal.ts
        project.dal.ts
        drawing.dal.ts
        stage.dal.ts
        site-note.dal.ts
        invoice.dal.ts
        whatsapp-message.dal.ts
    middleware.ts
    types/
      index.ts
```

## Commands

```bash
# Install
npm install

# Dev server
npm run dev

# Push schema to DB
npm run db:push

# Seed demo data
npm run db:seed

# Generate migrations
npm run db:generate

# Drizzle Studio
npm run db:studio

# Lint
npm run lint

# Build
npm run build
```

## Architecture Summary

Multi-tenant Postgres (firm_id on every table) deployed as single-tenant pilot for 1 firm. Next.js App Router handles both frontend (PWA installable) and API routes. Auth is phone + 4-6 digit PIN → jose JWT stored in httpOnly cookie `ms_session`. Files go to Cloudflare R2 via presigned URLs from @aws-sdk/client-s3. WhatsApp automation routes through n8n (Oracle Cloud Mumbai free VM) using Evolution API node. Site notes use IndexedDB (idb library) for offline capture and sync to server via /api/v1/site-notes/sync. Public progress pages (/progress/[projectId]) require no auth — client share links.

## Key Decisions & Why

| Decision | Choice | Reason |
|----------|--------|--------|
| DB | Neon Postgres | Free tier, Drizzle ORM fits, multi-tenant ready via firm_id |
| Auth | Phone + PIN (not email/password) | Architects use phone, PINs simpler on mobile |
| JWT storage | httpOnly cookie `ms_session` | Not localStorage — XSS protection |
| File storage | Cloudflare R2 via @aws-sdk/client-s3 | $0 egress, already in package.json, S3-compatible |
| WhatsApp | n8n + Evolution API | Free with personal number, no Meta business approval |
| Offline sync | IndexedDB (idb) with localId UUID | site_notes.local_id is client-generated UUID, server deduplicates |
| Stage weights | Sum ~92.5, progress = completedWeight/totalWeight*100 | Dynamic — never hardcode 100 as denominator |
| Client portal | NONE — WhatsApp only | Indian clients won't use a portal, WhatsApp is their UI |
| Firm registration | Hardcoded single firm for pilot | No signup flow; seed.ts creates the firm |

## Stage Hierarchy (CANONICAL — single source of truth)

All 31 leaf nodes with weights. Parent nodes have no weight of their own.

| stageKey | displayName | weight | sortOrder |
|----------|------------|--------|-----------|
| drawing | Drawings | — | 1 |
| drawing.brief | Brief | 2.0 | 1 |
| drawing.planning | Planning | 2.0 | 2 |
| drawing.structural | Structural Drawing | 2.0 | 3 |
| drawing.mep | MEP Drawings | — | 4 |
| drawing.mep.electrical | Electrical | 1.0 | 1 |
| drawing.mep.plumbing | Plumbing | 1.0 | 2 |
| drawing.mep.hvac | HVAC (Cassette/Split/Ducting) | 1.0 | 3 |
| drawing.exterior | Exterior Design | 1.0 | 5 |
| drawing.interior | Interior Drawing | 1.0 | 6 |
| building | Building | — | 2 |
| building.foundation | Foundation | — | 1 |
| building.foundation.excavation | Excavation | 5.0 | 1 |
| building.foundation.footing | Footing | 5.0 | 2 |
| building.foundation.plinth_beam | Plinth Beam | 5.0 | 3 |
| building.brick_work | Brick Work | 8.0 | 2 |
| building.slab | Slab Casting | — | 3 |
| building.slab.slab_beam | Slab Beam | 6.0 | 1 |
| building.slab.slab_casting | Slab Casting | 7.0 | 2 |
| finishing | Finishing | — | 3 |
| finishing.wall_finish | Wall Finish | — | 1 |
| finishing.wall_finish.plaster | Plaster Work | 4.0 | 1 |
| finishing.wall_finish.primer1 | Primer (1st coat) | 1.5 | 2 |
| finishing.wall_finish.putty | Putty | 2.0 | 3 |
| finishing.wall_finish.primer2 | Primer (2nd coat) | 1.5 | 4 |
| finishing.wall_finish.paint | Paint | 3.0 | 5 |
| finishing.floor | Floor | — | 2 |
| finishing.floor.pcc_laying | PCC Laying | 2.5 | 1 |
| finishing.floor.tile_stone | Tile / Stone | 3.5 | 2 |
| finishing.fall_ceiling | Fall Ceiling | 3.0 | 3 |
| electrical | Electrical | — | 4 |
| electrical.board_installation | Board Installation | 2.5 | 1 |
| electrical.wiring | Wiring | 3.0 | 2 |
| electrical.switch_board_lights | Switch Board & Lights | 2.5 | 3 |
| plumbing | Plumbing | — | 5 |
| plumbing.pipes | Pipes | 3.0 | 1 |
| plumbing.tap_sanitary | Tap & Sanitary Installation | 3.0 | 2 |
| door_window | Door / Window | — | 6 |
| door_window.chaukhat | Chaukhat | 2.5 | 1 |
| door_window.door_frame | Door Frame | 2.5 | 2 |
| door_window.window_frame | Window Frame | 2.5 | 3 |
| railing | Railing | — | 7 |
| railing.railing_work | Railing Work | 3.0 | 1 |

Total leaf weight: 92.5
Progress formula: `(sum of completed leaf weights / sum of all leaf weights) * 100`

## Drawing Types (8 fixed)

| drawingType (DB value) | displayName |
|----------------------|-------------|
| brief | Brief |
| planning | Planning |
| structural | Structural Drawing |
| mep_electrical | MEP — Electrical |
| mep_plumbing | MEP — Plumbing |
| mep_hvac | MEP — HVAC |
| exterior_design | Exterior Design |
| interior_drawing | Interior Drawing |

Drawing statuses: `not_started` → `submitted` → `approved` / `revised`

## User Roles

| role | Can do |
|------|--------|
| owner | Everything: manage users, view all, invoice, approve drawings |
| architect | Manage projects, drawings, stages, notes, invoices |
| site_supervisor | Add site notes, mark stage items complete — read-only on invoices |

## Auth Flow

- Login: POST /api/v1/auth/login with `{ phone, pin }` → bcrypt.compare(pin, pinHash) → jose SignJWT → set httpOnly cookie `ms_session` (7d expiry)
- Middleware: reads `ms_session` cookie → verifies JWT → injects firmId + userId into request headers → redirects to /login if missing/expired
- getCurrentUser(): reads cookie from request → decodes JWT → returns `{ userId, firmId, role }`
- requireAuth(): calls getCurrentUser(), throws 401 if null
- Public routes: /login, /progress/[projectId], /api/v1/webhooks/*, /api/v1/projects/[id]/progress

## Env Vars Required

| Var | Purpose | Example value |
|-----|---------|--------------|
| `DATABASE_URL` | Neon Postgres connection string | postgresql://user:pass@ep-xxx.neon.tech/manage_sathi?sslmode=require |
| `AUTH_SECRET` | JWT signing secret | random-32-char-string |
| `AUTH_COOKIE_NAME` | Session cookie name | ms_session |
| `R2_ACCOUNT_ID` | Cloudflare account ID | abc123 |
| `R2_ACCESS_KEY_ID` | R2 access key | key |
| `R2_SECRET_ACCESS_KEY` | R2 secret | secret |
| `R2_BUCKET_NAME` | R2 bucket | manage-sathi-files |
| `R2_PUBLIC_URL` | Public base URL for R2 | https://files.yourdomain.com |
| `N8N_BASE_URL` | n8n instance base | http://oracle-vm-ip:5678 |
| `N8N_SITE_NOTE_WEBHOOK` | n8n webhook for site notes | http://oracle-vm-ip:5678/webhook/site-note |
| `N8N_DRAWING_APPROVAL_WEBHOOK` | n8n webhook for drawing approval | http://oracle-vm-ip:5678/webhook/drawing-approval |
| `N8N_INVOICE_WEBHOOK` | n8n webhook for invoices | http://oracle-vm-ip:5678/webhook/invoice |
| `N8N_WEBHOOK_SECRET` | Shared secret for n8n auth | random-secret |
| `NEXT_PUBLIC_APP_URL` | Public app URL | https://manage-sathi.vercel.app |

See `.env.example` for the template. Never commit `.env.local`.

## WhatsApp / n8n Integration

n8n runs on Oracle Cloud Mumbai free VM. Evolution API node connects personal WhatsApp Business number.

Functions in `src/lib/whatsapp.ts`:
- `sendSiteNoteNotification(note, project)` — fires after site note created
- `sendDrawingForApproval(drawing, client, project)` — fires when drawing submitted
- `sendInvoice(invoice, client)` — fires when invoice sent

Each function POSTs to respective n8n webhook with `X-Webhook-Secret` header. If `N8N_SITE_NOTE_WEBHOOK` is not set, log and skip silently (graceful degradation for dev).

n8n workflows handle: WhatsApp → Evolution API → client phone. Replies come back via webhook to `/api/v1/webhooks/n8n`.

## Offline Strategy

Site notes work fully offline:
1. User captures note + photo on site (no network)
2. Note saved to IndexedDB `site-notes` store with `syncStatus: 'pending'`
3. Photo blob saved to IndexedDB `photos` store keyed by `photoLocalKey`
4. Entry added to `sync-queue` store
5. When online: service worker or manual trigger calls sync
6. Sync POSTs photo to R2 first (presigned URL), then POSTs note to `/api/v1/site-notes/sync`
7. Server deduplicates by `firm_id + local_id` (unique index in DB)
8. Server marks note synced, triggers n8n WhatsApp notification

## Testing Approach

- Test location: `src/__tests__/` (to be set up after Phase 1)
- Not set up yet — add after MVP phases are running

## Token-Efficient Codebase Lookup — Decision Tree

Use this hierarchy. Stop at the first tier that answers the question. Never skip to a lower tier without exhausting the one above it.

### Tier 0 — Already in context (0 tokens)
CLAUDE.md (this file) + `memory/project_context.md` load automatically. They contain:
- All API routes and page paths
- All phase definitions (0–12)
- Stack, auth flow, key invariants
- Seeded demo data IDs
**Use for:** "Where is the invoice API?", "What's the auth flow?", "What phase is next?"

### Tier 1 — agent_docs files (cheap — one Read, ~2–5KB)
Pre-written reference docs that answer broad questions without reading source:
| File | Answers |
|------|---------|
| `agent_docs/architecture.md` | All routes, pages, file map, request flows, invariants |
| `agent_docs/roadmap.md` | Phase steps, future DB schemas, files to create |
| `agent_docs/database.md` | All table schemas, columns, indexes |
| `agent_docs/api.md` | Request/response shapes for every endpoint |
| `agent_docs/auth.md` | JWT structure, middleware, session flow |
| `agent_docs/gotchas.md` | Non-obvious decisions, past bugs, workarounds |
**Use for:** "What does the invoices table look like?", "What does the sync endpoint return?"

### Tier 2 — Code Graph MCP (fast, targeted — ~50–200 tokens per call)
Graph is built: 71 nodes, 309 edges, 26 files (last built 2026-04-20).
**Known limitation:** `list_communities` and `list_flows` return 0 results — Next.js file-system routing is implicit, so no auto-clusters. Use function-level queries only.

| Question type | Tool to use |
|---------------|-------------|
| "What calls function X?" | `query_graph_tool(pattern="callers_of", target="X")` |
| "What does function X call?" | `query_graph_tool(pattern="callees_of", target="X")` |
| "What files import module Y?" | `query_graph_tool(pattern="importers_of", target="Y")` |
| "Find function named like Z" | `semantic_search_nodes_tool(query="Z", kind="Function")` |
| "What breaks if I change file F?" | `get_impact_radius_tool(changed_files=["F"], detail_level="minimal")` |
| "What changed vs last commit?" | `detect_changes_tool(detail_level="minimal")` |
| "Starting any non-trivial task" | `get_minimal_context_tool(task="...", repo_root="/Users/abhinavmittal/manage /sathi")` |

Always pass `repo_root="/Users/abhinavmittal/manage /sathi"` (note the space).
Always use `detail_level="minimal"` unless the result is insufficient.

**Rebuild graph after adding new files:**
Call `build_or_update_graph_tool(full_rebuild=False, repo_root="/Users/abhinavmittal/manage /sathi")`.
Full rebuild: set `full_rebuild=True`.

### Tier 3 — Direct file Read (expensive — use only for implementation details)
Only read a file when you need: exact line numbers, string literals, component JSX, specific function body. Use graph (Tier 2) to identify *which* file first, then read only that file.

---

## Context Files — Read On Demand

| File | Read when... |
|------|-------------|
| `agent_docs/architecture.md` | System design, new modules, major refactors |
| `agent_docs/roadmap.md` | Any phase work — full phase definitions 0–12 with step-by-step instructions |
| `agent_docs/database.md` | Models, migrations, queries |
| `agent_docs/api.md` | Any endpoint work |
| `agent_docs/auth.md` | Auth, sessions, tokens |
| `agent_docs/gotchas.md` | Something unexpected — read this first |

## Build Phases

| Phase | What | Status | Verify |
|-------|------|--------|--------|
| 0 | Config + install + UI shell + layout + dashboard | ✓ DONE | `npm run dev` → styled dashboard with nav |
| 1 | Auth (login/logout) + client CRUD + project CRUD | ✓ DONE | Login → create client → create project |
| 2 | Drawing tracker (8 types, upload, status) | ✓ DONE | Upload drawing → submit → approve/revise → version++ |
| 3 | Site stages with checklist hierarchy (all 31 nodes) | ✓ DONE | Accordion checklist → check stages → progress bars update |
| 4 | Site notes with offline + photo + WhatsApp | ✓ DONE | Airplane mode → capture → online → syncs → WhatsApp received |
| 5 | Drawing approval WhatsApp flow | ✓ DONE | Send for Approval → client WhatsApp → reply Approve → status updates |
| 6 | Progress view (stage cards + share link) | ✓ DONE | Stage cards show correct stage name → share link works in incognito |
| 7 | Invoicing (manual create + send via WhatsApp) | ✓ DONE | Create invoice → send WhatsApp → record payment → status = Paid |
| 8 | Deployment + pilot infra | ⏳ NEXT | R2 bucket → GitHub → Vercel → Oracle VM → n8n → WhatsApp QR → end-to-end test |
| 9 | One-click auto-invoice + Razorpay payment links | 🔲 POST-PILOT | Phase complete → invoice auto-generated → client pays via Razorpay link in WhatsApp |
| 10 | Labour attendance | 🔲 POST-PILOT | Supervisor marks attendance → weekly WhatsApp summary to architect |
| 11 | Legal approvals tracker (RERA, Fire NOC) | 🔲 POST-PILOT | Deadline added → 7-day WhatsApp reminder fires |
| 12 | Multi-tenancy + SaaS billing (Stripe) | 🔲 POST-PILOT | Firm signs up → subscribes → feature-gated by plan |

**Phases 0–7: COMPLETE. Phase 8: NEXT. Phases 9–12: Post-pilot.**

**For full step-by-step phase instructions → read `agent_docs/roadmap.md`**

MVP scope boundary:
- IN (phases 0–7): Project/client CRUD, drawing tracker with WhatsApp approval, site stages checklist, site notes offline+photo, client progress view, basic invoicing
- OUT until post-pilot: auto-invoice, Razorpay, labour, legal approvals, multi-tenancy, Stripe, GST auto-calc, change orders, Hindi voice

## Project-Specific Rules

- Never hardcode `firm_id` in business logic — always read from JWT via `getCurrentUser()`
- Every API route calls `requireAuth()` except: /api/v1/auth/*, /api/v1/webhooks/*, /api/v1/projects/[id]/progress (public)
- Stage completion only toggles leaf nodes — parent completion is computed, not stored
- Drawing file uploads: get presigned URL from /upload, client uploads directly to R2, then POST file_url to drawings table
- `local_id` in site_notes is client-generated UUID — server unique constraint on (firm_id, local_id) prevents duplicate syncs
- WhatsApp calls always wrapped in try/catch — failure logs but does NOT fail the main request
- Progress % = `(sum completedLeafWeights / sum allLeafWeights) * 100` — denominator is ~92.5, NOT 100

*Generated by Claude on: 2026-04-19 | Updated as project evolves*
