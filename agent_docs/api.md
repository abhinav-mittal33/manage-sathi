# API Reference
# Generated and maintained by Claude as endpoints are built.

## Base URLs

- Dev: `http://localhost:3000`
- Prod: `https://manage-sathi.vercel.app` (when deployed)

## Auth

Header set by middleware: all protected routes read `x-firm-id` and `x-user-id` from request headers.
Token obtained via: POST /api/v1/auth/login
Cookie: `ms_session` (httpOnly, 7-day JWT)

## Standard Response Format

```json
{ "success": true, "data": {} }
```

On error:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "human-readable" } }
```

500 errors: log full stack server-side, return generic `{ "error": "Internal server error" }` to client.

## Endpoints

### Auth
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/login` | No | `{ phone, pin }` → set ms_session cookie |
| POST | `/api/v1/auth/logout` | No | Clear ms_session cookie |

### Clients
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/clients` | Yes | List clients for firm. Query: `?search=` |
| POST | `/api/v1/clients` | Yes | Create client |
| GET | `/api/v1/clients/[id]` | Yes | Get single client with projects |
| PUT | `/api/v1/clients/[id]` | Yes | Update client |
| DELETE | `/api/v1/clients/[id]` | Yes | Soft delete (sets deleted_at) |

### Projects
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/projects` | Yes | List projects. Query: `?clientId=&status=` |
| POST | `/api/v1/projects` | Yes | Create project. Also seeds all 31 site_stages. |
| GET | `/api/v1/projects/[id]` | Yes | Get project with client |
| PUT | `/api/v1/projects/[id]` | Yes | Update project |
| DELETE | `/api/v1/projects/[id]` | Yes | Soft delete |
| GET | `/api/v1/projects/[id]/progress` | **No** | Public progress data (stage cards + %) |

### Drawings
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/projects/[id]/drawings` | Yes | All 8 drawing types for project |
| POST | `/api/v1/projects/[id]/drawings` | Yes | Create drawing entry (status: not_started) |
| GET | `/api/v1/projects/[id]/drawings/[drawingId]` | Yes | Single drawing |
| PUT | `/api/v1/projects/[id]/drawings/[drawingId]` | Yes | Update status/notes. On submit: triggers WhatsApp. On revise: increments version. |
| POST | `/api/v1/projects/[id]/drawings/[drawingId]/upload` | Yes | Get R2 presigned PUT URL for file upload |
| POST | `/api/v1/projects/[id]/drawings/[drawingId]/send-approval` | Yes | Trigger n8n webhook to send drawing to client via WhatsApp |

### Site Stages
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/projects/[id]/stages` | Yes | All site_stage rows for project |
| PUT | `/api/v1/projects/[id]/stages/[stageId]` | Yes | Toggle `is_completed`. Only leaf nodes. |
| GET | `/api/v1/projects/[id]/stages/progress` | Yes | Computed progress: overall % + per-category % |

### Site Notes
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/site-notes` | Yes | List notes. Query: `?projectId=&limit=&cursor=` |
| POST | `/api/v1/site-notes` | Yes | Create single note (online path) |
| POST | `/api/v1/site-notes/sync` | Yes | Batch sync from offline queue. Body: array of notes. Idempotent by local_id. |
| GET | `/api/v1/site-notes/[id]` | Yes | Single note |

### Invoices
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/invoices` | Yes | List invoices. Query: `?projectId=&status=` |
| POST | `/api/v1/invoices` | Yes | Create invoice (status: draft) |
| GET | `/api/v1/invoices/next-number` | Yes | Returns next invoice number (MS-2024-NNN format) |
| GET | `/api/v1/invoices/[id]` | Yes | Single invoice |
| PUT | `/api/v1/invoices/[id]` | Yes | Update (only if status=draft) |
| DELETE | `/api/v1/invoices/[id]` | Yes | Soft delete (only if status=draft) |
| POST | `/api/v1/invoices/[id]/send` | Yes | Mark as sent + trigger n8n WhatsApp webhook |
| POST | `/api/v1/invoices/[id]/payment` | Yes | Record payment `{ paidAmount, paymentMode, paymentReference }` |

### Webhooks (n8n callbacks — no auth, verified by X-Webhook-Secret header)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/webhooks/n8n` | Secret header | Generic n8n callback |
| POST | `/api/v1/webhooks/n8n/drawing-approval` | Secret header | Client replied Approve/Changes on WhatsApp |

### Webhook payload — drawing approval
```json
{
  "drawingId": "uuid",
  "action": "approved" | "changes_requested",
  "clientPhone": "+919876543210",
  "replyText": "Approved / Please change the kitchen layout",
  "whatsappMessageId": "wamid.xxx"
}
```

## Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | VALIDATION_ERROR | Zod validation failed — check `details` field |
| 401 | UNAUTHORIZED | Not authenticated — redirect to /login |
| 403 | FORBIDDEN | Authenticated but insufficient role |
| 404 | NOT_FOUND | Resource not found or belongs to different firm |
| 409 | CONFLICT | Duplicate (e.g. local_id already synced) |
| 500 | INTERNAL_ERROR | Server error — logged server-side |

## Rules

- All route handlers call `requireAuth()` first (except auth/* and webhooks/*)
- `firm_id` comes from JWT only — never trust request body for firm_id
- Input validated with Zod before business logic
- 500 errors: full stack trace logged server-side, generic message to client
- Webhook routes verify `X-Webhook-Secret: process.env.N8N_WEBHOOK_SECRET`
- File upload routes return presigned URLs — server never proxies binary data
- All list endpoints paginate: default limit 20, max 100, cursor-based
