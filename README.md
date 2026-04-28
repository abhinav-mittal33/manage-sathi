# Manage Sathi — मैनेज साथी

![Status](https://img.shields.io/badge/status-MVP%20Complete-39d353?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-n8n%20Integration-25D366?style=flat-square&logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

> **Project management for Indian architecture firms.**  
> Track drawings, site stages, notes, and invoices — all via WhatsApp.

---

## What it does

Architects in India manage 3–8 projects simultaneously across WhatsApp threads, Excel sheets, and phone calls. Manage Sathi replaces that chaos with one PWA:

| Feature | What happens |
|---------|-------------|
| **Drawing tracker** | Upload 8 drawing types → send for client approval via WhatsApp → client replies APPROVE or CHANGES → status updates automatically |
| **Site stages** | 31-node checklist hierarchy across 7 categories → live progress % per category and overall |
| **Site notes** | Supervisor captures note + photo on-site with no signal → syncs when back online → architect gets WhatsApp notification |
| **Client progress** | Shareable link (no login) → client sees visual progress with stage cards |
| **Invoicing** | Create invoice → send via WhatsApp → record payment → full audit trail |

---

## Stack

```
Frontend   Next.js 14 App Router (PWA, installable)
Database   Neon Postgres via Drizzle ORM
Auth       Phone + PIN → JWT in httpOnly cookie
Files      Cloudflare R2 (S3-compatible, $0 egress)
WhatsApp   n8n + Evolution API on Oracle Cloud Mumbai VM (always-free)
Offline    IndexedDB (idb) — site notes work with no signal
UI         shadcn/ui + Tailwind CSS
Deploy     Vercel (frontend) + Neon (DB) + Oracle Cloud (n8n)
```

---

## Architecture

```
Browser (PWA)
    │
    ├── Next.js App Router (Vercel)
    │       ├── /app/(app)/          → auth-protected pages
    │       ├── /app/progress/[id]   → public client share link
    │       └── /app/api/v1/         → REST API routes
    │
    ├── Neon Postgres (Singapore)
    │       └── Drizzle ORM — firm_id on every table (multi-tenant ready)
    │
    ├── Cloudflare R2
    │       └── Drawing files + site note photos (presigned upload URLs)
    │
    └── Oracle Cloud Mumbai VM (always-free)
            ├── n8n (port 5678)      → workflow automation
            └── Evolution API (8080) → WhatsApp via personal number
```

---

## Color Palette

| Name | Hex | Use |
|------|-----|-----|
| Plaster White | `#F8F6F1` | Background |
| Sage Green | `#8A9A7B` | Primary — completed, active |
| Sand | `#D1BFA7` | Secondary — in-progress, borders |
| Charcoal | `#2C2A26` | Text |

High-contrast for sunlight readability on construction sites.

---

## Stage Hierarchy

7 top-level categories → 31 leaf nodes → weights sum to 92.5

```
Drawings (11pts)  →  Building (36pts)  →  Finishing (23pts)
Electrical (8pts) →  Plumbing (6pts)   →  Door/Window (7.5pts)  →  Railing (3pts)
```

Progress formula: `(completed leaf weight / 92.5) × 100`  
Parent nodes are display-only — never stored as complete.

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/abhinav-mittal33/manage-sathi.git
cd manage-sathi

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in DATABASE_URL, AUTH_SECRET, R2_*, N8N_* values

# 4. Push schema to Neon
npm run db:push

# 5. Seed demo data
npm run db:seed

# 6. Run
npm run dev
```

Login: `+919999999999` / PIN `1234`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | JWT signing secret (run `openssl rand -base64 32`) |
| `AUTH_COOKIE_NAME` | `ms_session` |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | R2 S3-compatible secret |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public R2 URL (pub-xxx.r2.dev) |
| `N8N_BASE_URL` | n8n instance base URL |
| `N8N_SITE_NOTE_WEBHOOK` | n8n webhook for site note notifications |
| `N8N_DRAWING_APPROVAL_WEBHOOK` | n8n webhook for drawing approval flow |
| `N8N_INVOICE_WEBHOOK` | n8n webhook for invoice send |
| `N8N_WEBHOOK_SECRET` | Shared secret for n8n auth |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL |

---

## WhatsApp Flow

```
Architect clicks "Send for Approval"
    → App POSTs to n8n webhook
    → n8n sends WhatsApp via Evolution API
    → Client receives: "Drawing ready. Reply APPROVE or CHANGES."
    → Client replies on WhatsApp
    → Evolution API triggers n8n
    → n8n POSTs to /api/v1/webhooks/n8n/drawing-approval
    → Drawing status updates in DB
    → App reflects new status
```

No Meta Business API. No approval queue. Personal WhatsApp Business number via Evolution API.

---

## Build Phases

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Bootstrap + UI shell + dashboard | ✅ |
| 1 | Auth + Client CRUD + Project CRUD | ✅ |
| 2 | Drawing tracker (8 types, upload, versioning) | ✅ |
| 3 | Site stages (31 nodes, accordion, progress %) | ✅ |
| 4 | Site notes (offline-first, photo, IDB sync) | ✅ |
| 5 | Drawing approval WhatsApp flow | ✅ |
| 6 | Progress view (public share link) | ✅ |
| 7 | Invoicing (create, send, record payment) | ✅ |
| 8 | Deployment + pilot infra | 🔄 In progress |
| 9 | One-click auto-invoice + Razorpay | 🔲 Post-pilot |
| 10 | Labour attendance | 🔲 Post-pilot |
| 11 | Legal approvals tracker (RERA, Fire NOC) | 🔲 Post-pilot |
| 12 | Multi-tenancy + SaaS billing | 🔲 Post-pilot |

---

## Key Design Decisions

**No client portal** — Indian clients won't use a portal. WhatsApp is their UI. Everything reaches them via WhatsApp messages.

**Phone + PIN auth** — Architects are on mobile. PINs are simpler than passwords on a touch keyboard.

**Offline-first site notes** — Construction sites have poor signal. Notes + photos save to IndexedDB, sync when connectivity returns.

**firmId from JWT only** — Never from request body. Multi-tenant security invariant enforced at every API route.

**Single firm for pilot** — No signup flow for 2-month validation. One firm seeded directly.

---

## Commands

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run db:push      # Push schema to Neon (no migration files)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Drizzle Studio GUI
```

---

*Built for Indian architecture firms. Designed for sunlight, spotty signal, and WhatsApp-native clients.*
