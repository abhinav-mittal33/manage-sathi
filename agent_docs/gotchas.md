# Gotchas
# Maintained by Claude. Read first when something unexpected happens.

## Entry Format
**[Short title]**
- Symptom: [what you observe]
- Cause: [why it happens]
- Fix: [exact solution]
- File: `[affected file or module]`

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
