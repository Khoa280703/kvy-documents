# Development Roadmap

## Project Status: Complete (MVP)

The KVY document verification workflow MVP is fully implemented and all implementation phases are complete. Total effort: ~19 hours across 8 phases.

## Phase Overview

| # | Phase | Effort | Status | Completion Date |
|---|-------|--------|--------|----------------|
| 1 | [Project Setup](#phase-1-project-setup) | 2h | Complete | 2026-05-08 |
| 2 | [Authentication](#phase-2-authentication) | 2h | Complete | 2026-05-08 |
| 3 | [File Upload + Mock Service](#phase-3-file-upload-mock-service) | 2.5h | Complete | 2026-05-08 |
| 4 | [Verification Workflow](#phase-4-verification-workflow) | 3h | Complete | 2026-05-08 |
| 5 | [Seller UI](#phase-5-seller-ui) | 2.5h | Complete | 2026-05-08 |
| 6 | [Admin UI](#phase-6-admin-ui) | 2.5h | Complete | 2026-05-08 |
| 7 | [Socket.IO Real-time](#phase-7-socketio-realtime) | 2h | Complete | 2026-05-08 |
| 8 | [Testing + Error Handling + Deploy](#phase-8-testing-deploy) | 2.5h | Complete | 2026-05-08 |

## Completed Phases

### Phase 1: Project Setup

- pnpm monorepo with 4 packages (shared, backend, frontend, mock-service)
- Prisma schema with PostgreSQL (4 tables: User, Document, AuditLog, Notification)
- Docker Compose infrastructure (PostgreSQL 16 + Redis 7)
- Shared types package (enums, interfaces, constants)
- TypeScript strict mode across all packages
- Seed script for seller and admin test users

### Phase 2: Authentication

- JWT token-based auth with httpOnly cookie transport
- Login/register endpoints with bcrypt password hashing
- Role-based access control middleware (seller/admin)
- Auth middleware on all protected routes
- Socket.IO connection authentication via JWT cookie

### Phase 3: File Upload + Mock Service

- R2/S3 presigned URL generation for direct browser uploads
- File validation (PDF/PNG/JPG, 10MB max)
- Upload confirmation workflow with state transition
- Mock verification service (Express, port 3002)
- Random result simulation: 40% verified, 30% rejected, 30% inconclusive
- 2-10 second random processing delay

### Phase 4: Verification Workflow

- State machine with 8 states and guarded transitions
- Optimistic locking via version field
- BullMQ verification queue for async job dispatch
- BullMQ timeout queue (24h hard timeout)
- Webhook callback handler with Zod validation
- Auto-transition: inconclusive -> pending_review
- Audit log creation on every state transition
- Notification creation for terminal states

### Phase 5: Seller UI

- Next.js 16 App Router with role-based layouts
- Login page with form validation
- Document upload page with file picker and progress
- Dashboard showing document list with real-time status badges
- Socket.IO integration for live status updates

### Phase 6: Admin UI

- Admin dashboard with pending review queue
- Individual document review page with approve/reject actions
- Audit log viewer with filtering
- Optimistic lock conflict handling (409 responses)
- Review presence indication via Socket.IO

### Phase 7: Socket.IO Real-time

- Redis adapter for horizontal scaling
- Seller notification events on status changes
- Admin presence broadcast on review pages
- Notification persistence to database (dual push + persist pattern)
- Authentication on WebSocket connection handshake

### Phase 8: Testing + Error Handling + Deploy

- AppError class for consistent error handling
- Global error handler middleware
- Zod validation on webhook payloads
- Verification flow integration test (Vitest)
- Coolify deployment with Cloudflare DNS
- README.md with setup instructions

## Critical Path

```
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5/6 (parallel) -> Phase 7 -> Phase 8
```

## Next Steps (Post-MVP)

### Near-term (1-2 weeks)
1. R2 Storage — Replace filesystem fallback with production Cloudflare R2 storage
2. E2E Tests — Playwright tests covering full upload-to-verification flow
3. Email Notifications — Resend/AWS SES integration for status change emails
4. Document Preview — PDF/image preview in admin review page
5. Rate Limiting — Express rate-limit on auth and upload endpoints

### Medium-term (1-2 months)
1. Multi-document verification — Support multiple document types per verification request
2. Admin role hierarchy — Junior/senior reviewer levels with permission matrix
3. Document OCR validation — Pre-validation before external service dispatch
4. Dashboard analytics — Verification success rate, avg processing time, queue depth
5. Internationalization — Multi-language support for seller-facing content

### Long-term
1. Webhook retry with exponential backoff for external service
2. Document version history and comparison
3. Seller profile management beyond verification
4. Marketplace integration (product listing gating based on verification status)

## Known Descoped Items (from DESIGN.md)

| Item | Reason | Effort to Add |
|------|--------|--------------|
| Real email notifications | SMTP provider setup complexity | 2h |
| Document OCR analysis | External service handles this | 4h |
| Multi-document per seller | MVP scope constraint | 6h |
| Admin role hierarchy | All admins equal for MVP | 4h |
| Comprehensive test coverage | Time constraints | 6h |
| Document content preview | Frontend complexity | 2h |

## Success Metrics (Achieved)

- Two complete E2E paths working (verified path + inconclusive->admin review path)
- Input validation on all backend endpoints via Zod
- Error handling with no internal detail leakage
- 1 meaningful integration test for core verification flow
- No secrets in repository
- Deployed at public URL
- Complete README.md with setup and run instructions

## Design Decisions Reference

See [DESIGN.md](../DESIGN.md) for detailed architectural decisions including:
- Stack selection rationale (Express, Next.js, PostgreSQL, BullMQ, R2, Socket.IO)
- 5 key trade-off decisions with alternatives considered
- 7 failure mode analyses with mitigation strategies
- 5 descoped items with implementation plans
