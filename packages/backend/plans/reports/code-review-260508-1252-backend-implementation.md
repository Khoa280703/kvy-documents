# Code Review Report -- Backend Implementation

**Date:** 2026-05-08
**Scope:** Full backend src/ directory (19 files, ~460 LOC)
**Files Reviewed:** index.ts, utils (2), middleware (3), routes (5), services (5), queues (2), socket (2), tests (1)
**Overall Score:** 6.5 / 10
**Verdict:** REJECT -- 2 critical issues, 5 high issues require remediation before merge.

---

## Critical Issues

### CRIT-1: Webhook Endpoint Unauthenticated

**File:** `src/routes/webhook-routes.ts:14`

The `/api/webhook/verification` POST endpoint has no authentication middleware. Anyone with network access can call it to change any document's verification status.

```typescript
// Current -- no auth guard
router.post('/verification', async (req: Request, res: Response) => {
```

**Impact:** Complete bypass of the verification workflow. An attacker can mark arbitrary documents as `verified` or `approved`.

**Fix:** Add HMAC signature validation or at minimum an API-key header check:

```typescript
const apiKey = req.headers['x-webhook-secret'] as string;
if (apiKey !== process.env.WEBHOOK_SECRET) throw new AppError(401, 'Unauthorized webhook');
```

---

### CRIT-2: TOCTOU Race Condition in transitionState

**File:** `src/services/verification-service.ts:26-46`

`transitionState` reads the document, validates the transition, then updates in a separate call. Between read and update, a concurrent request can observe the same state and perform a duplicate transition.

```typescript
const doc = await prisma.document.findUnique({ where: { id: documentId } });
// ... validation ...
const updated = await prisma.document.update({ where: { id: documentId }, data: update });
```

The admin review endpoint (line 38 of `admin-routes.ts`) passes `expectedVersion`, which mitigates this for admin actions. But the webhook endpoint (line 17 of `webhook-routes.ts`) does NOT pass `expectedVersion`, so webhook calls are vulnerable to double-processing.

**Impact:** Document status can be transitioned twice concurrently, leading to inconsistent state and duplicate notifications.

**Fix:** Use a Prisma transaction with optimistic locking:

```typescript
const updated = await prisma.$transaction(async (tx) => {
  const doc = await tx.document.findUnique({ where: { id: documentId } });
  // ... validate ...
  return tx.document.update({ where: { id: documentId }, data: update });
});
```

---

## High Priority Issues

### HIGH-1: Multiple PrismaClient Instances (No Connection Pooling)

**Files:** `auth-routes.ts:9`, `admin-routes.ts:10`, `notification-routes.ts:6`, `document-service.ts:6`, `verification-service.ts:6`, `audit-service.ts:4`

Six separate `new PrismaClient()` calls across files. Prisma clients should be singleton-shared to use the connection pool efficiently.

**Impact:** Excessive database connections, resource waste, potential connection exhaustion under load.

**Fix:** Create a single instance in `src/utils/db-client.ts` and import it everywhere.

```typescript
// src/utils/db-client.ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

---

### HIGH-2: No Graceful Shutdown (Resource Leaks)

**File:** `src/index.ts`

No process signal handlers for SIGTERM/SIGINT. Prisma connections, Redis connections, Socket.IO server, and BullMQ workers are never cleaned up.

**Impact:** On deployment or restart, in-flight requests are killed, database connections leak, and Redis connections are orphaned.

**Fix:**

```typescript
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  io.close();
  // close Redis connections, stop workers
  httpServer.close(() => process.exit(0));
});
```

---

### HIGH-3: Multiple Orphaned Redis Connections

**Files:** `verification-queue.ts:4`, `timeout-queue.ts:5`, `socket-setup.ts:8-9`

Four separate IORedis connections are created (2 queue connections + 2 socket adapter clients). None are tracked for cleanup.

**Impact:** On process termination, connections leak. Redis server accumulates stale connections.

**Fix:** Centralize connection creation and add to shutdown handler.

---

### HIGH-4: Test Bypasses Business Logic

**File:** `src/__tests__/verification-flow.test.ts:32-41`

The test calls `prisma.document.update` directly, bypassing `transitionState` entirely. It does not test state machine validation, audit logging, or notifications.

**Impact:** Tests give false confidence. The actual transition logic (including the TOCTOU race condition) is untested.

**Fix:** Call `transitionState()` from the service layer in tests.

---

### HIGH-5: Test Cleanup Missing Cascade Deletes

**File:** `src/__tests__/verification-flow.test.ts:21-25`

`afterAll` deletes documents and users but does not delete related `auditLog` and `notification` records first. If FK constraints are RESTRICT or NO ACTION, cleanup will fail silently or leave orphaned records.

**Impact:** Flaky tests on repeated runs; accumulated test data in database.

**Fix:** Delete audit logs and notifications before deleting documents/users.

---

## Medium Priority Issues

### MED-1: Hardcoded JWT Fallback Secret

**File:** `src/utils/jwt-utils.ts:3`

```typescript
const SECRET = process.env.JWT_SECRET || 'dev-secret';
```

A known fallback secret means a missing env var does not fail fast. If this slips into production, JWT tokens are forgeable.

**Fix:** Fail on startup if `JWT_SECRET` is undefined in production:

```typescript
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production')
  throw new Error('JWT_SECRET is required in production');
```

---

### MED-2: `any` Types Throughout

| File | Line | Issue |
|------|------|-------|
| `notification-routes.ts` | 11 | `where: any` should be typed as `WhereInput` |
| `verification-service.ts` | 25, 35 | Return type `Promise<any>`, update as `any` |
| `audit-service.ts` | 19 | `data as any` cast bypasses type checking |
| `socket-setup.ts` | 7, 30 | `httpServer: any`, `socket as any` |
| `admin-routes.ts` | 39 | `req.user!` non-null assertion on potentially undefined |

**Impact:** TypeScript loses its safety guarantee at these points. Runtime errors may go undetected.

**Fix:** Use proper Prisma input types and explicit interfaces.

---

### MED-3: Unvalidated Pagination Parameters

**File:** `src/admin-routes.ts:23-24`

```typescript
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 20;
```

Negative values or `NaN` (e.g., `?page=-5`) result in unexpected behavior. `parseInt('abc')` returns `NaN`, and `NaN || 1` returns `1`, which masks the issue.

**Fix:** Use Zod validation:

```typescript
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

---

### MED-4: Redundant Function -- `createAndEmitNotification`

**File:** `src/services/notification-service.ts:30-37`

This function is a 1:1 wrapper around `createNotification` with no added logic. The name implies extra behavior that does not exist.

**Fix:** Remove `createAndEmitNotification` and use `createNotification` directly.

---

### MED-5: No Rate Limiting on Login

**File:** `src/routes/auth-routes.ts:14`

The `/api/auth/login` endpoint has no rate limiting. An attacker can brute-force passwords without throttling.

**Fix:** Add `express-rate-limit`:

```typescript
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
router.post('/login', loginLimiter, async (req, res) => { ... });
```

---

### MED-6: Zod Error Details Exposed to Client

**File:** `src/middleware/error-handler.ts:9-11`

```typescript
if (err instanceof ZodError) {
  return res.status(400).json({ error: 'Validation error', details: err.flatten() });
}
```

`err.flatten()` exposes internal model structure (field names, expected types) to the client.

**Fix:** Return only user-friendly messages or sanitize the details.

---

### MED-7: Hardcoded 24h Timeout

**File:** `src/routes/document-routes.ts:25`

```typescript
{ delay: 24 * 60 * 60 * 1000 }
```

Verification timeout is hardcoded. Should be configurable via environment variable for different environments.

**Fix:** `process.env.VERIFICATION_TIMEOUT_MS || 86400000`

---

## Low Priority Issues

### LOW-1: Cookie SameSite 'lax' Allows CSRF

**File:** `src/routes/auth-routes.ts:21`

`sameSite: 'lax'` allows the cookie to be sent on top-level GET requests initiated by third-party sites.

**Fix:** Use `sameSite: 'strict'` or `sameSite: 'none'` with `secure: true` depending on cross-origin requirements.

---

### LOW-2: Admin Can View Any User's Document Audit Logs

**File:** `src/admin-routes.ts:42-46`

`/api/admin/documents/:id/audit-logs` requires `requireAuth` but not `requireRole('admin')`. Any authenticated user can call this if they know a document ID.

The `getDocument` call on line 44 checks ownership, but the audit logs query on line 45 does not use the document reference to verify access.

**Fix:** Add `requireRole('admin')` to this route or reuse the ownership check from `getDocument`.

---

### LOW-3: No Input Validation on Webhook `reason`

**File:** `src/routes/webhook-routes.ts:11`

`reason: z.string().optional()` accepts arbitrarily long strings.

**Fix:** Add `.max(500)` or similar constraint.

---

### LOW-4: Recursive Audit Log for Inconclusive Auto-Transition

**File:** `src/services/verification-service.ts:57-59`

When `inconclusive` auto-transitions to `pending_review`, `transitionState` is called recursively, which creates a second audit log entry. This is by design but may result in noisy audit trails.

**Note:** Not a bug, but worth documenting in the audit trail.

---

### LOW-5: Socket.IO Type Cast (`as any`)

**File:** `src/socket/socket-setup.ts:30`

```typescript
io.on('connection', (socket) => handleConnection(socket as any));
```

The custom `socket.data.user` property is not reflected in the Socket.IO types. Use a typed middleware declaration instead.

---

## Positive Observations

1. **Zod validation on route inputs** -- Good use of schema validation at entry points (`loginSchema`, `webhookSchema`, `uuidSchema`).
2. **State machine validation** -- `VALID_TRANSITIONS` in `verification-service.ts` prevents invalid status changes.
3. **Optimistic locking via version field** -- Admin review endpoint passes `expectedVersion` to prevent concurrent edits.
4. **Audit logging** -- `createAuditLog` is called at key state transitions, providing traceability.
5. **Notification system** -- Real-time WebSocket notifications on state changes improve UX.
6. **Security headers** -- Helmet and CORS are properly configured in `index.ts`.
7. **HttpOnly cookies** -- JWT stored in httpOnly cookie prevents XSS-based token theft.
8. **BullMQ job queues** -- Decouples verification processing from request lifecycle.
9. **File type/size validation** -- `document-service.ts` validates against shared constants before creating records.

---

## Recommended Actions (Priority Order)

1. Add authentication/HMAC validation to webhook endpoint (CRIT-1)
2. Wrap `transitionState` in Prisma transaction or enforce optimistic locking for all callers (CRIT-2)
3. Consolidate `PrismaClient` into a singleton module (HIGH-1)
4. Add graceful shutdown handlers for Prisma, Redis, Socket.IO, Workers (HIGH-2, HIGH-3)
5. Rewrite tests to call service layer methods, not raw Prisma (HIGH-4)
6. Fix test cleanup to handle cascade deletes (HIGH-5)
7. Add rate limiting to login endpoint (MED-5)
8. Remove `any` types; add proper type annotations (MED-2)
9. Validate pagination parameters with Zod (MED-3)
10. Remove redundant `createAndEmitNotification` (MED-4)
11. Fail-fast on missing `JWT_SECRET` in production (MED-1)
12. Add `requireRole('admin')` to admin document audit log route (LOW-2)

---

## Metrics

| Metric | Value |
|--------|-------|
| Critical Issues | 2 |
| High Issues | 5 |
| Medium Issues | 7 |
| Low Issues | 5 |
| Type Safety (`any` count) | 6 |
| PrismaClient Instances | 6 (should be 1) |
| IORedis Connections | 4 (should be centralized) |
| Test Coverage (service layer) | Low -- tests bypass business logic |
| Lint Issues (estimated) | ~12 (any types, missing validators) |

---

## Unresolved Questions

1. Is the webhook endpoint intended to be called by an external third-party verification service? If so, HMAC or mTLS auth is mandatory.
2. What is the expected QPS for this service? Connection pooling and graceful shutdown become more critical at scale.
3. Are there CI/CD tests that validate against a real database, or is this test file the only integration test?
4. Is the `@kvy/shared` package available for review? `ALLOWED_FILE_TYPES` and `MAX_FILE_SIZE` constants are critical security boundaries.
