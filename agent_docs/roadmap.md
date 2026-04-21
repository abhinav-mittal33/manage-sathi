# Roadmap
# Generated and maintained by Claude. Never edited manually.
# Read this before any new phase work.

## Current Status (as of 2026-04-20)

**Phases 0–7: COMPLETE. Zero TypeScript errors.**
**Phase 8: NEXT — Deployment + pilot infra.**
**Phases 9–12: Post-pilot, build after 2-month validation.**

---

## All Phases Overview

| Phase | What | Status | When |
|-------|------|--------|------|
| 0 | Config + install + UI shell + layout + dashboard | ✓ DONE | Built |
| 1 | Auth + Client CRUD + Project CRUD | ✓ DONE | Built |
| 2 | Drawing tracker (8 types, R2 upload, versioning) | ✓ DONE | Built |
| 3 | Site stages (31 leaf nodes, accordion, progress %) | ✓ DONE | Built |
| 4 | Site notes (offline-first, photo, IDB sync) | ✓ DONE | Built |
| 5 | Drawing approval WhatsApp flow (n8n webhook) | ✓ DONE | Built |
| 6 | Progress view (public share link + architect view) | ✓ DONE | Built |
| 7 | Invoicing (create, send via WhatsApp, record payment) | ✓ DONE | Built |
| 8 | Deployment + pilot infra | ⏳ NEXT | Now |
| 9 | One-click auto-invoice + Razorpay | 🔲 TODO | Post-pilot |
| 10 | Labour attendance | 🔲 TODO | Post-pilot |
| 11 | Legal approvals tracker | 🔲 TODO | Post-pilot |
| 12 | Multi-tenancy + SaaS billing | 🔲 TODO | Post-pilot scale |

---

## MVP Scope Boundary

### IN (phases 0–7, all done)
- Project + client CRUD
- Drawing tracker (8 types) with WhatsApp approval flow — architect sends drawing → client gets WhatsApp → taps Approve or Changes → status updates in app
- Site stages with exact 7-category checklist hierarchy (all 31 leaf nodes with weights summing to 92.5)
- Site notes with photo + offline support → WhatsApp notification to architect
- Client progress view (visual house filling with stage cards + %)
- Basic invoicing (manual create + send via WhatsApp + record payment)

### OUT until post-pilot
- One-click phase upgrade with auto-invoice
- Razorpay integration + bank SMS parsing
- Legal approvals tracker (RERA, Fire NOC)
- Labour attendance
- Change orders / variation billing
- GST auto-calculation
- Retainage tracking
- Multi-tenancy billing
- Hindi voice note transcription

---

## Phase 8 — Deployment & Pilot Setup

**Goal:** Live app at real URL, WhatsApp flowing end-to-end, architect friend actively using it.
**Constraint:** 100% free (Neon free tier + Cloudflare R2 free + Oracle Cloud Mumbai always-free VM + personal WhatsApp Business number).

### 8.1 — Cloudflare R2 Bucket
1. cloudflare.com → R2 → Create bucket named `manage-sathi-files`
2. R2 → Manage R2 API tokens → Create token with Object Read & Write
3. Note: Account ID, Access Key ID, Secret Access Key
4. Enable public access on bucket OR add custom domain
5. Add to `.env.local` + Vercel environment variables:
   ```
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret
   R2_BUCKET_NAME=manage-sathi-files
   R2_PUBLIC_URL=https://pub-XXXX.r2.dev
   ```

### 8.2 — GitHub Repository
```bash
cd "/Users/abhinavmittal/manage /sathi"
git remote add origin https://github.com/abhinav-mittal33/manage-sathi.git
git branch -M main
git push -u origin main
```

### 8.3 — Vercel Deployment
1. vercel.com → Add New Project → Import from GitHub
2. Select manage-sathi repo
3. Framework: Next.js (auto-detected)
4. Root directory: leave blank (already at root)
5. Add ALL environment variables (copy from .env.local):
   - DATABASE_URL (Neon connection string)
   - AUTH_SECRET (JWT secret)
   - AUTH_COOKIE_NAME=ms_session
   - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
   - N8N_BASE_URL, N8N_SITE_NOTE_WEBHOOK, N8N_DRAWING_APPROVAL_WEBHOOK, N8N_INVOICE_WEBHOOK, N8N_WEBHOOK_SECRET
   - NEXT_PUBLIC_APP_URL=https://manage-sathi.vercel.app (or your custom domain)
6. Deploy → get Vercel URL → set that as NEXT_PUBLIC_APP_URL

### 8.4 — Oracle Cloud Mumbai VM
1. cloud.oracle.com → Compute → Instances → Create Instance
2. Region: ap-mumbai-1 (India — low latency for WhatsApp webhooks)
3. Shape: VM.Standard.E2.1.Micro (always-free, 1 OCPU, 1GB RAM)
4. OS: Ubuntu 22.04
5. Download or paste SSH key
6. After create: go to VCN → Security Lists → Ingress Rules → open ports:
   - 22 (SSH)
   - 5678 (n8n)
   - 8080 (Evolution API)

### 8.5 — Install Docker + n8n + Evolution API on VM
```bash
# SSH into VM
ssh ubuntu@YOUR_VM_IP

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
# logout and login again

# Run n8n
docker run -d --restart unless-stopped \
  --name n8n -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=changeme123 \
  -e WEBHOOK_URL=http://YOUR_VM_IP:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n

# Run Evolution API
docker run -d --restart unless-stopped \
  --name evolution-api -p 8080:8080 \
  -e AUTHENTICATION_TYPE=apikey \
  -e AUTHENTICATION_API_KEY=your_evo_api_key \
  -e WEBHOOK_GLOBAL_ENABLED=true \
  atendai/evolution-api:latest
```

### 8.6 — WhatsApp QR Code Scan
1. Open `http://YOUR_VM_IP:8080` in browser
2. POST to `/instance/create` with body `{ "instanceName": "manage-sathi" }` and header `apikey: your_evo_api_key`
3. GET `/instance/fetchInstances` → find manage-sathi → copy the QR code
4. Open WhatsApp Business on architect's phone → Linked Devices → Scan QR
5. Status becomes CONNECTED — WhatsApp is live

### 8.7 — n8n Workflows

Open n8n at `http://YOUR_VM_IP:5678` (admin/changeme123).

**Workflow 1 — Site Note Notification**
```
Webhook (POST /webhook/site-note)
  → IF X-Webhook-Secret header matches
  → HTTP Request (Evolution API send message)
      URL: http://localhost:8080/message/sendText/manage-sathi
      Body: { number: "{{$json.project.architectPhone}}", text: "📸 New site note for {{$json.project.name}}: {{$json.note.text}}" }
      Headers: apikey: your_evo_api_key
```

**Workflow 2a — Drawing Approval Send**
```
Webhook (POST /webhook/drawing-approval)
  → IF X-Webhook-Secret header matches
  → HTTP Request (Evolution API)
      Body: { number: "{{$json.client.phone}}", text: "🏗 Drawing ready for approval: {{$json.drawing.drawingType}} v{{$json.drawing.version}}. Reply APPROVE or CHANGES." }
```

**Workflow 2b — Drawing Reply Handling**
```
Evolution API Webhook (incoming message trigger)
  → IF message body contains "APPROVE" or "CHANGES"
  → Set action: IF contains "APPROVE" → "approved" ELSE "changes_requested"
  → HTTP Request to Vercel: POST https://manage-sathi.vercel.app/api/v1/webhooks/n8n/drawing-approval
      Body: { action, drawingId: from message metadata, clientPhone }
      Headers: x-webhook-secret: your_webhook_secret
```

**Workflow 3 — Invoice Send**
```
Webhook (POST /webhook/invoice)
  → IF X-Webhook-Secret header matches
  → HTTP Request (Evolution API)
      Body: { number: "{{$json.client.phone}}", text: "🧾 Invoice {{$json.invoice.invoiceNumber}} for {{$json.projectName}}: ₹{{$json.invoice.totalAmount}}. Due: {{$json.invoice.dueDate}}. Please confirm receipt." }
```

### 8.8 — Update .env.local and Vercel with n8n URLs
```
N8N_BASE_URL=http://YOUR_VM_IP:5678
N8N_SITE_NOTE_WEBHOOK=http://YOUR_VM_IP:5678/webhook/site-note
N8N_DRAWING_APPROVAL_WEBHOOK=http://YOUR_VM_IP:5678/webhook/drawing-approval
N8N_INVOICE_WEBHOOK=http://YOUR_VM_IP:5678/webhook/invoice
N8N_WEBHOOK_SECRET=random-32-char-secret
```
Redeploy on Vercel after updating env vars.

### 8.9 — End-to-End Test
1. Login at Vercel URL: +919999999999 / PIN 1234
2. Open Sharma Villa → Drawings
3. Upload any drawing → click "Send for Approval"
4. Verify: WhatsApp message arrives on client's phone
5. Reply "APPROVE" from client's phone
6. Verify: Drawing status changes to `approved` in app
7. Add site note with photo → verify WhatsApp to architect
8. Create invoice → send → verify WhatsApp to client

### 8.10 — Real Firm Data
Edit `src/db/seed.ts`:
- Replace firm name/address with real architect's firm
- Replace owner phone (+919999999999 → real phone) + real PIN
- Replace client with actual client name + phone
- Replace "Sharma Villa" with real current project
Run against production: `DATABASE_URL="..." npm run db:seed`
Or create via UI after login.

**Phase 8 verify:** App live → drawing approval WhatsApp flow works end-to-end → architect actively using app

---

## Phase 9 — One-Click Auto-Invoice + Razorpay

**Pre-condition:** Pilot complete, product validated, architect paying manually is bottleneck.

### What to build

**9.1 — Phase completion trigger**
- "Mark Phase Complete" button on site stages page
- When clicked: auto-generate invoice for that phase
- Phase→amount mapping configurable per project (new `project_phases` table)
- Schema: `project_phases(id, firmId, projectId, phaseKey, phaseName, amount, invoiceId, completedAt)`

**9.2 — Razorpay payment links**
- On invoice send: generate Razorpay payment link (Razorpay API)
- WhatsApp message includes payment link: "Pay ₹X: https://rzp.io/..."
- New env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
- New API: POST `/api/v1/invoices/[id]/payment-link`

**9.3 — Razorpay webhook**
- POST `/api/v1/webhooks/razorpay` (new route)
- Verify Razorpay signature (razorpay-node SDK)
- On `payment.captured`: update invoice status = `paid`, record paymentDate + paymentMethod='razorpay'

**Files to create:**
- `src/lib/razorpay.ts` — Razorpay client + payment link generation
- `src/app/api/v1/invoices/[id]/payment-link/route.ts`
- `src/app/api/v1/webhooks/razorpay/route.ts`
- `src/lib/validations/payment-link.ts`

**Files to modify:**
- `src/db/schema.ts` — add `project_phases` table
- `src/lib/dal/invoice.dal.ts` — add `insertPaymentLink()`, `markPaidByRazorpay()`
- `src/components/invoices/send-invoice-button.tsx` — add "Generate Payment Link" option
- `src/components/stages/stage-checklist.tsx` — add "Complete Phase" button at category level

---

## Phase 10 — Labour Attendance

**Pre-condition:** Pilot shows architect tracks workers on paper/WhatsApp.

### What to build

**New DB table:**
```sql
labour_attendance (
  id uuid PK,
  firm_id uuid FK,
  project_id uuid FK,
  worker_name text,
  worker_phone text (optional),
  date date,
  hours_worked decimal(4,1),
  wage_per_hour decimal(10,2),
  notes text,
  created_by uuid FK users,
  created_at timestamp
)
```

**New pages:**
- `/(app)/projects/[id]/attendance` — daily attendance list + mark attendance form
- `/(app)/projects/[id]/attendance/new` — capture attendance (offline-first, same IDB pattern as site notes)

**New API routes:**
- GET/POST `/api/v1/projects/[id]/attendance`
- GET `/api/v1/projects/[id]/attendance/summary` — weekly/monthly summary

**WhatsApp summary (n8n scheduled):**
- Every Sunday: "This week for {project}: X worker-days, ₹Y wages paid"
- n8n Cron node → HTTP to summary API → Evolution API send

**Files to create:**
- `src/db/schema.ts` — add `labour_attendance` table
- `src/lib/dal/attendance.dal.ts`
- `src/lib/services/attendance.service.ts`
- `src/lib/validations/attendance.ts`
- `src/app/api/v1/projects/[id]/attendance/route.ts`
- `src/components/attendance/attendance-form.tsx`
- `src/components/attendance/attendance-list.tsx`
- `src/app/(app)/projects/[id]/attendance/page.tsx`

---

## Phase 11 — Legal Approvals Tracker

**Pre-condition:** Pilot shows legal deadline misses causing project delays.

### What to build

**New DB table:**
```sql
legal_approvals (
  id uuid PK,
  firm_id uuid FK,
  project_id uuid FK,
  approval_type text, -- 'rera' | 'fire_noc' | 'municipal_plan' | 'occupancy_cert' | 'commencement_cert' | 'custom'
  approval_name text, -- display name
  status text, -- 'not_started' | 'applied' | 'pending' | 'received' | 'rejected'
  applied_date date,
  expected_date date, -- deadline for reminder
  received_date date,
  document_url text, -- R2 URL
  notes text,
  created_at timestamp,
  updated_at timestamp
)
```

**Reminder logic (n8n scheduled):**
- Daily cron: check expected_date within 7 days + status != 'received'
- WhatsApp to architect: "⚠️ {approval_name} deadline in {X} days for {project.name}"

**Files to create:**
- `src/db/schema.ts` — add `legal_approvals` table
- `src/lib/dal/legal-approval.dal.ts`
- `src/lib/services/legal-approval.service.ts`
- `src/lib/validations/legal-approval.ts`
- `src/app/api/v1/projects/[id]/approvals/route.ts`
- `src/app/api/v1/projects/[id]/approvals/[approvalId]/route.ts`
- `src/components/approvals/approval-list.tsx`
- `src/components/approvals/approval-form.tsx`
- `src/app/(app)/projects/[id]/approvals/page.tsx`

**n8n workflow (4th workflow):**
- Cron trigger: daily at 9am IST
- HTTP to `/api/v1/projects/[id]/approvals?upcomingDays=7`
- For each result: Evolution API send WhatsApp

---

## Phase 12 — Multi-Tenancy + SaaS Billing

**Pre-condition:** Product-market fit validated, want to onboard paying firms.

### What to build

**12.1 — Signup flow**
- Remove hardcoded single firm from seed.ts
- New pages: `/signup`, `/onboarding`
- Signup: firm name + owner phone + PIN → creates firm + owner user
- Onboarding wizard: firm address, GST number, WhatsApp Business number

**12.2 — Subscription tiers**
- Free: 1 active project, 1 user, no WhatsApp
- Pro (₹999/mo): unlimited projects, 3 users, WhatsApp enabled
- Team (₹2499/mo): unlimited everything, 10 users, priority support

**12.3 — Stripe integration** (NOT Razorpay for subscriptions — Stripe is better)
- New env vars: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- Stripe Customer per firm, Stripe Subscription per plan
- New DB: `subscriptions(firmId, stripeCustomerId, stripePriceId, status, currentPeriodEnd)`
- Middleware: check subscription.status == 'active' for protected routes

**12.4 — Admin dashboard** (internal, owner-only at `/admin`)
- Firm list: name, plan, MRR, last active
- Churn tracking

**12.5 — Feature gating**
- Middleware function: `checkFeatureAccess(firmId, feature)` reads subscription tier
- Gates: WhatsApp (Pro+), multi-user (Pro+), unlimited projects (Pro+)

**Files to create (lots — plan carefully):**
- `src/app/signup/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/settings/billing/page.tsx`
- `src/app/admin/page.tsx` (internal dashboard)
- `src/lib/stripe.ts`
- `src/app/api/v1/auth/signup/route.ts`
- `src/app/api/v1/billing/checkout/route.ts`
- `src/app/api/v1/billing/portal/route.ts`
- `src/app/api/v1/webhooks/stripe/route.ts`
- `src/lib/dal/subscription.dal.ts`
- `src/lib/services/subscription.service.ts`
- `src/db/schema.ts` — add `subscriptions` table

---

## Key Architectural Decisions (don't revisit without reason)

| Decision | What | Why |
|----------|------|-----|
| No client portal | WhatsApp only | Indian clients won't use a portal, WhatsApp is their UI |
| Single firm seed | Not signup flow | 2-month pilot, no need for self-serve yet |
| Soft deletes | deleted_at timestamp | Audit trail, never hard delete |
| IDB for offline | idb library | Site notes must work on-site without signal |
| Server-side tax | taxAmount computed in DAL | Client-provided values can't be trusted |
| firmId from JWT | Never from body | Multi-tenant security invariant |
| Evolution API | Not Meta Business API | Free with personal number, no 90-day approval |
| Oracle Cloud VM | Not Railway/Render for n8n | Free forever, Mumbai = low latency for India |
