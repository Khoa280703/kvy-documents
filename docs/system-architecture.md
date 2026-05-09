# System Architecture

## Overview

KVY is a full-stack document verification pipeline for seller onboarding on a marketplace platform. Sellers upload identity/business documents, the system orchestrates external verification via async job queues, and inconclusive results are routed to an admin review queue with real-time notifications.

## Monorepo Structure

The project uses pnpm workspaces with four packages sharing types and constants through the `@kvy/shared` package.

```
packages/
  shared/        - TypeScript types, enums, constants (no runtime dependencies)
  backend/       - Express API + Prisma ORM + BullMQ + Socket.IO
  frontend/      - Next.js 16 App Router (React 19) + Tailwind CSS
  mock-service/  - Standalone Express service simulating external verification API
docker-compose.yml - PostgreSQL 16 + Redis 7 infrastructure
```

### Package Dependencies

| Package | Package Name | Key Dependencies | Depends On |
|---------|-------------|------------------|------------|
| shared | `@kvy/shared` | None (zero dependencies) | - |
| backend | `@kvy/backend` | Express, Prisma, BullMQ, Socket.IO, Zod, AWS SDK (S3) | `@kvy/shared` |
| frontend | `frontend` | Next.js 16, React 19, Tailwind CSS 4 | None (uses shared types via workspace) |
| mock-service | `@kvy/mock-service` | Express, Zod | None |

## Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Database | PostgreSQL 16 | Primary data store (users, documents, audit logs, notifications) |
| Cache/Queue | Redis 7 | BullMQ job persistence + Socket.IO Redis adapter |
| ORM | Prisma | Type-safe database access with auto-generated migrations |
| File Storage | AWS S3 / Cloudflare R2 | Document file storage via presigned URLs (filesystem fallback for dev) |

## Backend Architecture

The Express API server runs on port 3001 and provides REST endpoints alongside a Socket.IO WebSocket server on the same HTTP server.

### Middleware Stack

```
helmet (security headers) -> cors (origin: frontend URL) -> express.json -> cookie-parser -> routes -> error-handler
```

### Route Structure

| Route Prefix | Handler | Auth Required | Role |
|-------------|---------|--------------|------|
| `/api/auth` | `auth-routes.ts` | No (login/register) | Public |
| `/api/documents` | `document-routes.ts` | Yes | Seller (own docs), Admin (all) |
| `/api/admin` | `admin-routes.ts` | Yes | Admin only |
| `/api/notifications` | `notification-routes.ts` | Yes | Any authenticated user |
| `/api/webhook` | `webhook-routes.ts` | Webhook secret header | External service |

### Service Layer

| Service | File | Responsibility |
|---------|------|----------------|
| `document-service` | `services/document-service.ts` | CRUD operations, file validation, ownership checks, rate limiting (one active verification per seller) |
| `verification-service` | `services/verification-service.ts` | State machine transitions, optimistic locking, audit logging, post-transition effects |
| `audit-service` | `services/audit-service.ts` | Audit log creation and queries |
| `notification-service` | `services/notification-service.ts` | Persist notifications + Socket.IO push |
| `r2-service` | `services/r2-service.ts` | Presigned URL generation for direct-to-S3 uploads |
| `prisma-client` | `services/prisma-client.ts` | Singleton Prisma client instance |

### Queue System

| Queue | File | Purpose |
|-------|------|---------|
| `verification` | `queues/verification-queue.ts` | Dispatches document to mock verification service, handles retries on failure |
| `timeout` | `queues/timeout-queue.ts` | Delayed job (24h) that marks unresponded verifications as `expired` |

Verification worker flow:
1. Job enqueued with `{ documentId, fileKey }`
2. Worker POSTs to mock service at `POST /verify` with callback URL
3. Mock service responds asynchronously via webhook callback
4. Timeout worker fires after 24h if no webhook received

### WebSocket Layer

| Component | File | Purpose |
|-----------|------|---------|
| `socket-setup` | `socket/socket-setup.ts` | Socket.IO server init with JWT auth middleware and Redis adapter |
| `socket-events` | `socket/socket-events.ts` | Connection handling, room management, event routing |

Socket.IO uses Redis pub/sub adapter for horizontal scaling. Authentication is enforced via JWT token extracted from cookies on connection handshake.

### Error Handling

| Pattern | Implementation |
|---------|---------------|
| Custom errors | `AppError` class with status code and message |
| Input validation | Zod schemas on webhook and request bodies |
| Global handler | `error-handler.ts` middleware catches all unhandled errors |
| Race conditions | Optimistic locking via `version` field on documents |

## Frontend Architecture

Next.js 16 App Router with React 19 and Tailwind CSS 4.

### Route Structure

| Route | Layout | Purpose | Role |
|-------|--------|---------|------|
| `/` | Root | Landing page | Public |
| `/login` | Root | Authentication | Public |
| `/seller/dashboard` | Seller layout | Document status overview | Seller |
| `/seller/upload` | Seller layout | Document upload form | Seller |
| `/admin/dashboard` | Admin layout | Pending review queue | Admin |
| `/admin/review/[id]` | Admin layout | Individual document review | Admin |
| `/admin/audit` | Admin layout | Audit log viewer | Admin |

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `api-client` | `lib/api-client.ts` | Typed fetch wrapper with credential handling |
| `use-auth` | `hooks/use-auth.ts` | Authentication state management hook |
| `status-badge` | `components/status-badge.tsx` | Document status visual indicator |

API calls go through `apiClient()` which sets `credentials: 'include'` for httpOnly cookie transport.

## Shared Types

The `@kvy/shared` package exports all cross-package types without runtime dependencies.

| Export | File | Content |
|-------|------|---------|
| `DocumentStatus` | `enums.ts` | 8 states: pending_upload, pending_verification, verified, rejected, inconclusive, pending_review, approved, expired |
| `UserRole` | `enums.ts` | seller, admin |
| `ActorType` | `enums.ts` | system, seller, admin |
| `User`, `Document`, `AuditLog`, `Notification` | `types.ts` | Interface definitions |
| `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `VERIFICATION_TIMEOUT_MS` | `constants.ts` | Shared configuration values |
| API types | `api-types.ts` | Request/response type definitions |
| Webhook types | `webhook-types.ts` | Webhook payload type definitions |

## Data Model

```
User (1) <-->> (*) Document
  |                    |
  |                    |-->> (*) AuditLog
  |                    |-->> (*) Notification
  |                    |
  |-->> (*) Notification (as receiver)
  |-->> (*) Document (as reviewer)
```

Key fields:
- `Document.version` - Optimistic lock counter, incremented on each state transition
- `Document.status` - Current state in the verification state machine
- `AuditLog.actor_type` - Distinguishes system vs seller vs admin actions
- `Notification.is_read` - Read/unread state for user notification inbox

## State Machine

### States

| State | Description | Transitions Out |
|-------|-------------|----------------|
| `pending_upload` | Record created, awaiting file upload | -> `pending_verification` (seller uploads) |
| `pending_verification` | File uploaded, waiting for external service | -> `verified`, `rejected`, `inconclusive`, `expired` (system) |
| `verified` | External service confirmed valid | Terminal |
| `rejected` | External service or admin confirmed invalid | Terminal (seller creates new record) |
| `inconclusive` | External service cannot determine | -> `pending_review` (auto, system) |
| `pending_review` | Awaiting admin manual review | -> `approved`, `rejected` (admin) |
| `approved` | Admin manually approved | Terminal |
| `expired` | No response within 24h | Terminal (seller creates new record) |

### Transition Guards

- `pending_upload -> pending_verification`: File must be valid type (PDF/PNG/JPG), size <= 10MB, seller must own document, no active verification in progress
- `pending_verification -> *`: Only system (BullMQ worker/webhook handler) can transition
- `pending_review -> approved/rejected`: Admin role required, optimistic lock version must match
- Terminal states (verified, approved, rejected, expired): No transitions out; seller creates new document record

### Transition Rules (from code)

```typescript
const VALID_TRANSITIONS = {
  pending_upload: ['pending_verification'],
  pending_verification: ['verified', 'rejected', 'inconclusive', 'expired'],
  inconclusive: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  verified: [],
  approved: [],
  rejected: [],
  expired: [],
};
```

Auto-transition: When status becomes `inconclusive`, the system immediately transitions to `pending_review` within the same transaction flow via `postTransitionEffects()`.

## Data Flow

### Document Upload Flow
```
Seller UI -> POST /api/documents (create) -> R2 presigned URL
  -> Seller uploads file directly to R2
  -> POST /api/documents/:id/confirm -> status: pending_verification
  -> BullMQ verification queue enqueued
```

### Verification Flow
```
BullMQ Worker -> POST /verify (mock service)
  -> Mock service processes (2-10s random delay)
  -> Mock service POSTs /api/webhook/verification with result
  -> Webhook handler validates (Zod schema + secret header)
  -> transitionState() applies state machine transition
  -> postTransitionEffects() handles notifications + auto-transitions
  -> Socket.IO emits status update to seller
```

### Admin Review Flow
```
Admin UI -> GET /api/admin/pending-review (list)
  -> Admin opens /admin/review/:id
  -> Socket.IO broadcasts review presence to other admins
  -> Admin POSTs decision with version number
  -> Optimistic lock validates version, rejects if stale
  -> Audit log entry created
  -> Socket.IO notifies seller of outcome
```

### Timeout Flow
```
BullMQ timeout queue (delayed 24h)
  -> Checks document status
  -> If still pending_verification -> transition to expired
  -> If already resolved -> no-op (400 error ignored)
```

## Security Considerations

| Concern | Implementation |
|---------|---------------|
| Authentication | JWT tokens in httpOnly cookies, verified on every request |
| Authorization | Role-based middleware guards (seller/admin) |
| File upload | Type validation (PDF/PNG/JPG), size limit (10MB), presigned URL with Content-Length condition |
| Webhook auth | x-webhook-secret header validation |
| Optimistic locking | Version field prevents concurrent admin edits |
| Audit trail | All state transitions logged with actor, action, metadata |
| CORS | Configured to allow only frontend origin |
| Helmet | Security headers on all responses |
| Rate limiting | One active verification per seller enforced at application level |

## Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| Frontend (Next.js) | 3000 | HTTP |
| Backend (Express) | 3001 | HTTP + WebSocket |
| Mock Service | 3002 | HTTP |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
