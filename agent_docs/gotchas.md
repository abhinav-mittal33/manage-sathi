# Gotchas
# Maintained by Claude. Read first when something unexpected happens.

## Entry Format
**[Short title]**
- Symptom: [what you observe]
- Cause: [why it happens]
- Fix: [exact solution]
- File: `[affected file or module]`

---

## Session 3 Work (2026-04-25) — site-visit-confirm fix

### WAHA Core tier cannot send images (sendImage / sendFile are Plus-only)
- **Symptom:** `site-visit-confirm` n8n workflow errors with WAHA 422 "The feature is available only in Plus version for 'WEBJS' engine"
- **Cause:** WAHA WEBJS Core free tier blocks ALL binary sends — both base64 and URL-based. Only `sendText` works on free tier.
- **Fix:** n8n `site-visit-confirm` workflow `Send Image` node has `onError: "continueErrorOutput"` + error connection → `Send Text`. Site visit notes fall back to text-only WhatsApp automatically. Photos are visible in the app.
- **To get real images in WhatsApp:** Upgrade to WAHA Plus (~$19/month). No code change needed — photoUrl (from R2) flows to the same Send Image node which will succeed with Plus.
- **Workflow change location:** n8n `site-visit-confirm` workflow ID `NaJbZqvyhcFZllun`, `Send Image` node

### SQLite WAL mode hides recent writes from docker cp
- **Symptom:** `docker cp n8n:/home/node/.n8n/database.sqlite` returns stale data — new executions not visible
- **Cause:** SQLite WAL mode keeps writes in `database.sqlite-wal` until checkpoint. docker cp misses the WAL file.
- **Fix:** To read live n8n data: `docker run --rm -v manage-sathi-local_n8n_data:/data python:3.11-alpine python3 -c "import sqlite3; db=sqlite3.connect('/data/database.sqlite'); db.execute('PRAGMA wal_checkpoint(TRUNCATE)'); ..."`

### n8n SQLite file must be owned by UID 1000 (node user)
- **Symptom:** n8n crashes on start: `SQLITE_READONLY: attempt to write a readonly database`
- **Cause:** After `docker cp` or Python container writes (which run as root/UID 501), the database.sqlite owner changes. n8n runs as UID 1000 (`node`); if file is owned by different UID and group is not `1000`, n8n can only read.
- **Fix:** `docker run --rm -v manage-sathi-local_n8n_data:/data alpine:latest sh -c "chown 1000:1000 /data/database.sqlite && chmod 664 /data/database.sqlite"`

---

## Session 2 Work (2026-04-24) — Complete Record

### Local Dev WhatsApp Stack
- **Docker Compose:** `/tmp/manage-sathi-local/docker-compose.yml`
- Services: `waha` (port 3000), `n8n` (port 5678), `evo-postgres` (port 5433)
- WAHA uses `platform: linux/amd64` (Rosetta on Apple Silicon — no ARM image)
- WAHA session name MUST be `"default"` (Core tier limit)
- WAHA env: `WAHA_API_KEY=manage-sathi-local-key`, `WAHA_DASHBOARD_USERNAME=admin`, `WAHA_DASHBOARD_PASSWORD=manage-sathi-pass`
- Cloudflare tunnel: `cloudflared tunnel --url http://localhost:5678` → get HTTPS URL → set in `.env.local` for all N8N_*_WEBHOOK vars
- n8n API key expires when container restarts — regenerate at `localhost:5678` → Settings → API

### n8n Workflows (all active, localhost:5678)
| ID | Name | Webhook path |
|----|------|-------------|
| QwVaeNnsut3FsiU4 | Site Note → WhatsApp | /webhook/site-note |
| RIFm1mwlHVruLCsY | Invoice → WhatsApp | /webhook/invoice |
| mrO4M5l24MTP4pBO | Drawing Approval → WhatsApp | /webhook/drawing-approval |
| NaJbZqvyhcFZllun | site-visit-confirm | /webhook/site-visit | Falls back to text on WAHA 422 |
| vXXJ8FOOvI4Qpgts | approval-request | /webhook/approval-request | |
| incomingWhatsAppReply1 | Incoming WhatsApp Reply → Approval Update | (WAHA pushes incoming messages) | Calls /api/v1/webhooks/n8n/site-note-approval |

### n8n Workflow Node Version Rules (CRITICAL)
- Webhook node MUST be `typeVersion: 2` — v1 crashes execution silently, empty data, no error captured
- IF node MUST be `typeVersion: 2` — v1 conditions format incompatible with n8n 2.17.7
- Data from webhook body: `$json.body.fieldName` NOT `$json.fieldName`
- chatId format: `"91" + $json.body.clientPhone.replace(/\D/g,"").slice(-10) + "@c.us"`
- HTTP Request params must have `"options": {}` field present

### 3-Type Site Notes Redesign (fully implemented + db:push done)
**Types:** `site_visit` (photo→client WhatsApp), `personal` (team-only, no WA), `approval_request` (text→client approval WA)

**DB columns added to site_notes:** `note_type varchar(20) default 'personal'`, `approval_status varchar(20)`

**Files changed:**
- `src/db/schema.ts` — noteType, approvalStatus columns
- `src/lib/validations/site-note.ts` — 3-type zod schema
- `src/lib/dal/site-note.dal.ts` — noteType filter, approvalStatus on insert, findProjectWithClientForNote() joins clients
- `src/lib/whatsapp.ts` — sendSiteVisitConfirmation(), sendApprovalRequest()
- `src/lib/services/site-note.service.ts` — dispatchWhatsApp() helper routes by noteType
- `src/app/api/v1/site-notes/route.ts` — ?noteType= filter
- `src/lib/offline/db.ts` — IDB v1→v2, noteType field
- `src/lib/offline/sync.ts` — noteType in sync payload
- `src/components/site-notes/note-capture-form.tsx` — 3-card type selector UI
- `src/components/site-notes/note-card.tsx` — type badges, approval status badges
- `src/app/(app)/site-diary/page.tsx` — 5 tabs: All/Site Visits/My Notes/Approvals/Deleted

**New env vars (add to .env.local):**
```
N8N_SITE_VISIT_WEBHOOK=http://localhost:5678/webhook/site-visit
N8N_APPROVAL_WEBHOOK=http://localhost:5678/webhook/approval-request
```

### CSS Fix (globals.css)
- **Problem:** Tailwind v4-style imports (`@import "shadcn/tailwind.css"`) + `oklch()` vars, but tailwind.config.ts uses `hsl(var(--...))` → all colors invalid → entire UI unstyled
- **Fix:** Removed bad imports, rewrote all CSS vars as `H S% L%` triplets
- `src/app/globals.css` — now clean Tailwind v3 format

### Project Form Client UUID Bug (fixed)
- shadcn SelectValue doesn't auto-show label for pre-set values → showed raw UUID
- Fix: explicit children in SelectValue: `{clientId ? clients.find(c=>c.id===clientId)?.name : undefined}`
- `src/components/projects/project-form.tsx`

### Architect's WhatsApp ID
`919784577736@c.us` — confirmed receives messages

---

## Project-Specific Gotchas

**Stage weight total is 92.5, not 100**
- Symptom: Progress calculation shows wrong percentages if you divide by 100
- Cause: The leaf-node weights sum to 92.5, not 100 — this is intentional from planning
- Fix: Always use `completedWeight / totalWeight * 100` where totalWeight is computed from the actual sum of all leaf weights. Never hardcode 100 as denominator.
- File: `src/lib/services/progress.service.ts`, `src/lib/constants/stage-hierarchy.ts`

**Parent stage nodes have no weight**
- Symptom: Trying to mark a parent stage (e.g. 'building.foundation') complete throws error or does nothing
- Cause: Only leaf nodes (stageKey has no children) have weight and can be marked complete. Parent completion is derived.
- Fix: Check if a stage has children before allowing toggle. If it has children, it's display-only.
- File: `src/lib/constants/stage-hierarchy.ts`, `src/lib/services/stage.service.ts`

**Offline sync idempotency: duplicate local_id is silently accepted**
- Symptom: Syncing twice doesn't create duplicate — second call returns 200 but no new row
- Cause: `(firm_id, local_id)` has UNIQUE constraint. Server checks if exists before inserting.
- Fix: This is correct behavior. Client should mark as synced after first 200 response.
- File: `src/lib/dal/site-note.dal.ts`, `src/db/schema.ts`

**Drawing revision creates new row, not update**
- Symptom: After revise, old drawing row still exists with version N
- Cause: Drawings are immutable per version. Revise = new row with version+1, drawing_type same.
- Fix: Query for `MAX(version)` to get current drawing for each type. Old versions preserved for audit.
- File: `src/lib/dal/drawing.dal.ts`

**WhatsApp failure must NOT fail the main request**
- Symptom: n8n is down → site note save also fails
- Cause: WhatsApp call not in try/catch
- Fix: Always wrap `sendSiteNoteNotification()` etc. in try/catch. Log error, continue. WhatsApp is best-effort.
- File: `src/lib/whatsapp.ts` and all callers

**n8n webhooks may not be configured in dev**
- Symptom: WhatsApp functions throw "Missing env var" in development
- Cause: N8N_SITE_NOTE_WEBHOOK etc. not set in .env.local
- Fix: `whatsapp.ts` checks if webhook URL is set; if not, logs "WhatsApp not configured, skipping" and returns. Never hard-fail.
- File: `src/lib/whatsapp.ts`

**Neon cold start in free tier**
- Symptom: First DB request after idle period takes 500-2000ms
- Cause: Neon free tier pauses the compute after ~5 min inactivity
- Fix: This is expected in dev. In production, Neon's paid tier auto-scales. For pilot, users will see occasional slow first loads.
- File: `src/db/index.ts`

**firm_id from request body = security hole**
- Symptom: User from Firm A can access Firm B data by passing firm_id in request body
- Cause: Taking firm_id from request body instead of JWT
- Fix: ALWAYS get firmId from `requireAuth(request).firmId`. Never from `request.body.firmId`.
- File: ALL API route handlers

**jose vs jsonwebtoken API**
- Symptom: `jwt.sign()` is not a function
- Cause: jose uses different API than jsonwebtoken
- Fix: Use `new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setExpirationTime('7d').sign(secret)` and `jwtVerify(token, secret)` where secret is `new TextEncoder().encode(process.env.AUTH_SECRET)`
- File: `src/lib/auth.ts`

**Cookie sameSite must be 'lax' not 'strict'**
- Symptom: Session lost when clicking WhatsApp link back to app
- Cause: sameSite: 'strict' blocks cookie on cross-site navigation (WhatsApp → app)
- Fix: Set `sameSite: 'lax'`
- File: `src/app/api/v1/auth/login/route.ts`

**R2 uses S3-compatible API but endpoint differs**
- Symptom: S3 client throws 403 or endpoint error
- Cause: R2 endpoint is `https://{accountId}.r2.cloudflarestorage.com` not AWS endpoint
- Fix: Set `endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`` in S3Client config. Region must be `'auto'`.
- File: `src/lib/storage.ts`

**IndexedDB version bump required for schema changes**
- Symptom: Old IndexedDB schema causes store-not-found errors after code update
- Cause: Browser cached old version
- Fix: Increment DB version in `openDB()` call and add upgrade handler
- File: `src/lib/offline/db.ts`

---

## Environment & Config

**Missing env var fails silently with undefined**
- Symptom: Feature returns wrong data or breaks with no clear error
- Cause: `process.env.VAR` returns undefined if var missing, no exception
- Fix: Validate all required env vars at startup in `src/lib/env.ts` and throw descriptive error on boot
- File: `src/lib/env.ts` (create this)

**ORM N+1 query on list endpoints**
- Symptom: List endpoint is slow; DB query count scales with returned rows
- Cause: Lazy loading related objects inside a loop
- Fix: Use Drizzle `with:` for eager loading or batch queries
- File: Any DAL returning lists with nested relations

**JWT expiry not validated**
- Symptom: Expired tokens continue to work
- Cause: Token decoded but exp claim not checked
- Fix: jose `jwtVerify` checks exp automatically — ensure it's called, not just `decodeJwt`
- File: `src/middleware.ts`

---

## Phase 8 Deployment — Fallback (E2.1.Micro, 1GB RAM)

**Primary plan (roadmap):** Oracle A1 Ampere (4 OCPU, 24GB RAM) + Docker.
**Use this only if A1 stays unavailable and you need to deploy on E2.1.Micro.**

**Step 1 — Add swap (do this first, required):**
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Step 2 — Install Node.js 20:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Step 3 — Run n8n directly (no Docker):**
```bash
sudo npm install -g n8n
n8n start --tunnel &   # or use pm2
```

**Step 4 — Run Evolution API directly (no Docker):**
```bash
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api
cp .env.example .env   # fill in values
npm install
npm run build
npm start &            # or use pm2
```

**Step 5 — Use pm2 to keep both alive:**
```bash
sudo npm install -g pm2
pm2 start n8n --name n8n
pm2 start "npm start" --name evolution-api --cwd /home/ubuntu/evolution-api
pm2 save
pm2 startup
```

**Ports:** n8n on 5678, Evolution API on 8080 — same as Docker plan. All n8n workflow steps identical.
