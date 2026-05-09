# Phase 4: Verification Workflow

## Context
- [DESIGN.md](../../DESIGN.md) — Section 3.4 (State Machine), Section 5 (Decision 1: webhook), Section 6 (F1, F2: failure modes)
- Depends on: Phase 2 (auth), Phase 3 (upload + mock service)
- **Core of the project** — the state machine + async processing pipeline

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 3h
- **Description:** BullMQ job dispatch on upload confirmation, webhook handler for mock service callback, state machine transitions with guards, audit logging for every transition, 24h timeout via delayed job.

## Key Insights
- BullMQ handles: dispatch to mock service, retries with exponential backoff, 24h timeout delayed job
- Webhook endpoint receives callback from mock service — validates with Zod, transitions state
- `inconclusive` auto-transitions to `pending_review` (creates admin notification)
- Optimistic locking via `version` field on document prevents race conditions
- Every state transition creates an audit log entry

## Requirements

### Functional
- On upload confirmation: enqueue BullMQ job to POST to mock verification service
- BullMQ worker: POST to mock service with { documentId, callbackUrl, fileKey }
- Webhook endpoint `POST /api/webhook/verification` — receives mock service callback
- State transitions: pending_verification → verified | rejected | inconclusive
- Auto-transition: inconclusive → pending_review (immediate, creates notification for admins)
- Admin review: `POST /api/documents/:id/review` — approve or reject with optimistic locking
- 24h timeout: delayed BullMQ job marks document as expired
- Audit log on every transition

### Non-Functional
- BullMQ retry: 5 attempts with exponential backoff (1m, 5m, 15m, 30m, 60m)
- Webhook validation: Zod schema, reject malformed payloads
- Optimistic lock: version field increment on every write

## Related Code Files

### Files to Create
- `packages/backend/src/queues/verification-queue.ts` — BullMQ queue + worker definition
- `packages/backend/src/queues/timeout-queue.ts` — delayed job for 24h expiry
- `packages/backend/src/services/verification-service.ts` — state machine logic
- `packages/backend/src/services/audit-service.ts` — audit log creation
- `packages/backend/src/routes/webhook-routes.ts` — POST /api/webhook/verification
- `packages/backend/src/routes/admin-routes.ts` — admin review endpoint

### Files to Modify
- `packages/backend/src/index.ts` — register webhook + admin routes, init BullMQ
- `packages/backend/src/routes/document-routes.ts` — trigger BullMQ job on confirm-upload

## Implementation Steps

### 1. Create audit service
```typescript
// packages/backend/src/services/audit-service.ts
export async function createAuditLog(params: {
  documentId: string;
  actorId?: string;
  actorType: 'system' | 'seller' | 'admin';
  action: string;
  metadata?: Record<string, unknown>;
}): Promise<void>
// Simple INSERT into audit_logs table via Prisma
```

### 2. Create verification service (state machine)
```typescript
// packages/backend/src/services/verification-service.ts

// Core state transition function with guards
export async function transitionState(
  documentId: string,
  newStatus: DocumentStatus,
  params: {
    actorId?: string;
    actorType: ActorType;
    reason?: string;
    expectedVersion?: number; // for optimistic locking
  }
): Promise<Document>

// Valid transitions map:
const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  pending_upload: ['pending_verification'],
  pending_verification: ['verified', 'rejected', 'inconclusive', 'expired'],
  inconclusive: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  // Terminal states have no outgoing transitions
  verified: [],
  rejected: [],
  approved: [],
  expired: [],
};

// Guard checks:
// - Validate transition is allowed
// - For admin actions: check expectedVersion matches current version
// - For system actions: no version check needed
// - Increment version on every write
// - Create audit log
// - If new status is 'inconclusive': auto-transition to 'pending_review'
// - If terminal state: create notification for seller
```

### 3. Create BullMQ verification queue
```typescript
// packages/backend/src/queues/verification-queue.ts
import { Queue, Worker } from 'bullmq';

export const verificationQueue = new Queue('verification', { connection: redisConfig });

// Worker processes jobs:
const worker = new Worker('verification', async (job) => {
  const { documentId, fileKey } = job.data;
  const callbackUrl = `${WEBHOOK_BASE_URL}/api/webhook/verification`;
  
  // POST to mock service
  const response = await fetch(`${MOCK_SERVICE_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, callbackUrl, fileKey }),
  });
  
  if (!response.ok) throw new Error(`Mock service returned ${response.status}`);
}, {
  connection: redisConfig,
  attempts: 5,
  backoff: { type: 'custom', delay: (attemptsMade) => {
    // 1m, 5m, 15m, 30m, 60m
    const delays = [60000, 300000, 900000, 1800000, 3600000];
    return delays[attemptsMade - 1] || 3600000;
  }},
});
```

### 4. Create timeout queue
```typescript
// packages/backend/src/queues/timeout-queue.ts
// On verification job dispatch, also enqueue a delayed job:
// delay: 24 * 60 * 60 * 1000 (24h)
// When delayed job fires: check if document is still pending_verification
// If yes: transition to 'expired', notify seller
// If no (already resolved): do nothing (job is a no-op)
```

### 5. Create webhook route
```typescript
// packages/backend/src/routes/webhook-routes.ts

// POST /api/webhook/verification
// NO auth middleware (external service calling in)
// Validate body with Zod: { documentId, status, reason? }
// Validate status is one of: verified, rejected, inconclusive
// Call verificationService.transitionState()
// If inconclusive: auto-transition to pending_review, create admin notification
// Return 200 OK
// On validation error: log to audit, set inconclusive, return 400
```

### 6. Create admin review route
```typescript
// packages/backend/src/routes/admin-routes.ts

// POST /api/documents/:id/review
// Auth: requireRole('admin')
// Body: { action: 'approve' | 'reject', reason: string, version: number }
// Validate with Zod
// Call verificationService.transitionState() with optimistic lock
// If version mismatch: return 409 Conflict
// Create notification for seller
// Return updated document

// GET /api/admin/pending-reviews
// Auth: requireRole('admin')
// Return documents with status: pending_review
// Include seller info, submitted_at, audit history
```

### 7. Integrate with confirm-upload
```typescript
// Update packages/backend/src/routes/document-routes.ts
// In POST /api/documents/:id/confirm-upload handler:
// After confirmUpload() succeeds:
//   1. Enqueue verification job
//   2. Enqueue timeout job (24h delayed)
```

### 8. Create notification service
```typescript
// packages/backend/src/services/notification-service.ts
export async function createNotification(params: {
  userId: string;
  documentId: string;
  type: string;
  message: string;
}): Promise<void>
// INSERT into notifications table
// Socket.IO emission will be added in Phase 7
```

## Todo List
- [ ] Create audit service
- [ ] Create verification service with state machine + guards
- [ ] Create BullMQ verification queue + worker
- [ ] Create timeout queue (24h delayed jobs)
- [ ] Create webhook route with Zod validation
- [ ] Create admin review route with optimistic locking
- [ ] Create notification service
- [ ] Integrate verification dispatch into confirm-upload flow
- [ ] Test full flow: upload → BullMQ → mock service → webhook → state transition
- [ ] Test admin review with version conflict (409)
- [ ] Test 24h timeout expiry

## Success Criteria
- Upload confirmation enqueues BullMQ job
- Worker POSTs to mock service successfully
- Webhook receives callback and transitions document state
- Inconclusive auto-transitions to pending_review
- Admin can approve/reject with optimistic locking
- Version mismatch returns 409 Conflict
- Every state transition has an audit log entry
- Invalid webhook payloads are handled gracefully (set inconclusive)
- Timeout job marks stale documents as expired

## Risk Assessment
- **Risk:** BullMQ worker crash loses jobs
  - **Mitigation:** Redis persistence (AOF), jobs survive worker restart
- **Risk:** Race condition between webhook and timeout job
  - **Mitigation:** State machine guards — timeout job checks current status before transitioning
- **Risk:** Mock service unreachable
  - **Mitigation:** Exponential backoff retries, expires after 24h

## Security Considerations
- Webhook endpoint has no auth but validates documentId exists in DB
- Consider adding a shared secret/HMAC for webhook authentication (stretch goal)
- Admin review requires role guard + optimistic lock
