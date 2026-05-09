# Brainstorm Report: Document Verification Workflow — DESIGN.md Decisions

## Problem Statement
KVY TECH take-home project: design + implement a Document Verification Workflow for marketplace platform. DESIGN.md is the primary artifact (highest evaluation weight).

## Agreed Stack

| Layer | Choice | Rejected Alternatives | Rationale |
|-------|--------|----------------------|-----------|
| Frontend | **Next.js** (App Router, TS) | Vue/Nuxt | React ecosystem dominance, SSR, widely understood |
| Backend | **Express** (TS) | NestJS, Fastify, Hono | Brief explicitly lists backend frameworks; Express = most popular, zero learning curve |
| Database | **PostgreSQL + Prisma** | MySQL, SQLite, Drizzle, TypeORM | Prisma = best DX + type-safety; PostgreSQL = best for complex queries + audit |
| Queue | **BullMQ + Redis** | RabbitMQ, pg-boss, setTimeout | RabbitMQ over-engineered for 1 job type; pg-boss lacks retry sophistication; BullMQ = right balance |
| Auth | **JWT + bcrypt** | NextAuth, Better Auth, express-session | Stateless, natural for cross-origin (separate FE/BE), role claims in token |
| File Storage | **Cloudflare R2** | Local filesystem, DB BLOB | User has R2 available; production-ready, presigned URLs, S3-compatible |
| Real-time | **Socket.IO** | SSE, polling | Bidirectional needed for admin lock broadcast + seller notifications |
| Mock Service | **Separate micro-service** | Endpoint in Express, webhook-only | Shows clear boundary with external service; webhook callback pattern for realism |
| Deploy | **Coolify + Cloudflare** | Vercel, Railway, Render | User has home server + domain ready |

## Architecture Decisions

### 1. State Machine (6 states)
```
pending_upload → pending_verification → verified (terminal)
                                      → rejected (terminal)
                                      → inconclusive → pending_review → approved (terminal)
                                                                      → rejected (terminal)
```

**Guards:**
- `pending_upload → pending_verification`: triggered by seller upload
- `pending_verification → *`: only system (BullMQ worker) can transition
- `pending_review → approved|rejected`: only admin can transition
- Terminal states: `verified`, `rejected`, `approved`

**Addition discussed:** `expired` state if verification service doesn't respond within X hours → seller can re-upload. Include in DESIGN.md as a consideration/descoped item.

### 2. Mock Verification Service
- Separate Node.js micro-service (own port)
- Receives verification request via HTTP POST
- After random delay (1-30 seconds for demo), calls webhook URL back with result
- Random distribution: ~40% verified, ~30% rejected, ~30% inconclusive
- Simulates real-world async external API pattern

### 3. Notification System
- **In-app**: Real-time via Socket.IO — seller receives push when status changes
- **Email (mock)**: Log to DB/console, don't send real email. Show in DESIGN.md as extensibility point
- Socket.IO rooms: each seller joins room `seller:{id}`, notifications pushed to room

### 4. Audit Trail
- Separate `audit_logs` table (append-only)
- Schema: `id, document_id, actor_id, actor_type(system|admin|seller), action, metadata(JSON), created_at`
- Every state transition = 1 audit log entry
- Admin dashboard queries this table for full history view

### 5. Concurrent Admin Review
- **Real-time lock via Socket.IO**: when admin opens review, broadcast to others → UI shows "Being reviewed by Admin X"
- **Optimistic locking (safety net)**: `version` field on document record, `UPDATE ... WHERE version = X`
- Admin who loses race gets friendly error + auto-refresh
- Elegant: reuses existing Socket.IO infrastructure

### 6. Project Structure
```
kvy-document-verification/          # monorepo root
├── pnpm-workspace.yaml
├── packages/
│   ├── frontend/                   # Next.js app
│   ├── backend/                    # Express API
│   └── mock-service/               # Mock verification service
├── DESIGN.md
├── README.md
└── .env.example
```

## DESIGN.md Outline

### 1. Problem Framing
- Real problem: trust + compliance in marketplace onboarding
- Stakeholders: seller (fast onboarding), admin (efficient review), platform (fraud prevention, compliance)
- Out of scope: document OCR/AI analysis, multi-document types, seller profile management

### 2. Clarifying Questions (≥8)
Priority order, top 3 with working assumptions:
1. SLA cho verification response time? → Assume: 24h timeout, then expired
2. Concurrent admin capacity? → Assume: <10 admins, optimistic locking sufficient
3. Document types/size limits? → Assume: PDF/images only, max 10MB
4. Re-upload allowed after rejection? → Assume: Yes, creates new verification record
5. Notification channels required? → Assume: in-app only for MVP
6. Admin roles hierarchy? → Assume: flat, all admins equal
7. Data retention policy? → Assume: keep all records indefinitely
8. Rate limiting on uploads? → Assume: 1 pending verification per seller at a time

### 3. Architecture
- Component diagram (Mermaid)
- Data model: users, documents, verification_records, audit_logs
- State machine diagram (Mermaid)

### 4. Stack Decisions
- As agreed above, with rejected alternatives and rationale

### 5. Trade-offs (5 decisions)
1. BullMQ vs in-process setTimeout — reliability vs simplicity
2. Separate mock service vs internal endpoint — boundary clarity vs deployment overhead
3. Optimistic vs pessimistic locking — simplicity vs UX
4. JWT vs session — stateless cross-origin vs server-side control
5. Append-only audit log vs event sourcing — query simplicity vs rebuild capability

### 6. Failure Modes (≥5)
1. External service malformed response → validate response schema, mark as `inconclusive` on parse failure
2. Service unreachable for hours → BullMQ retry with exponential backoff (max 5 retries), then mark `expired`
3. 50MB PDF upload → frontend + backend validation (10MB limit), reject before storage
4. Two admins review simultaneously → Socket.IO broadcast + optimistic locking
5. Notification delivery failure → retry queue, notification_status field, admin can see undelivered
6. Redis down → BullMQ graceful degradation, jobs persist on restart; health check endpoint
7. R2 upload failure → presigned URL retry, temporary local fallback

### 7. Descoped Items
- Document OCR/AI verification
- Email notifications (real SMTP)
- Multi-document support per seller
- Admin role hierarchy
- Internationalization

### 8. Implementation Plan
- Phase 1: Project setup, DB schema, auth (Day 1)
- Phase 2: File upload + mock service (Day 1-2)
- Phase 3: Verification workflow + BullMQ (Day 2)
- Phase 4: Admin review UI + audit trail (Day 3)
- Phase 5: Socket.IO notifications + real-time lock (Day 3-4)
- Phase 6: Testing + polish (Day 4)
- Phase 7: Deploy + README (Day 5)

## Implementation Scope (Artifact 2)
Build **both paths** end-to-end:
1. Upload → verified → seller notified (happy path)
2. Upload → inconclusive → admin review → approved/rejected → seller notified (full path)

## Risks
- WebSocket adds complexity — if time-constrained, fallback to polling
- Cloudflare R2 integration needs testing — have local filesystem fallback ready
- BullMQ + Redis on Coolify needs proper Docker setup

## Next Steps
→ Write DESIGN.md based on these decisions
→ Then implement Artifact 2 following the plan
