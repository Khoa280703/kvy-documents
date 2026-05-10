# KVY Document Verification Workflow

## What I built

A full-stack document verification pipeline for seller onboarding:

- **Monorepo** (pnpm workspaces): shared types, Express API, Next.js UI, mock verification service
- **Auth**: JWT with httpOnly cookies, role-based access (seller/admin), cross-subdomain cookie support
- **File Upload**: Cloudflare R2 presigned URL upload (S3-compatible)
- **Verification Workflow**: BullMQ async jobs dispatch to mock service, webhook callbacks trigger state machine transitions
- **State Machine**: 8 states with guarded transitions and optimistic locking (version field)
- **Document Preview**: Both seller and admin can preview/download uploaded files via R2 presigned URLs
- **Admin Review**: Inconclusive results auto-route to admin queue with approve/reject + reason
- **Real-time**: Socket.IO notifications on status changes
- **Audit Trail**: Every state transition logged with actor, action, timestamp, and metadata
- **Deployed**: Frontend and backend live on custom subdomain via Coolify + Cloudflare Tunnel

## What I'd build next

1. **Comprehensive E2E Tests**: Playwright tests covering full upload → verification → admin review flow
2. **Email Notifications**: Send emails on status changes using Resend/AWS SES alongside in-app notifications
3. **Rate Limiting**: Express rate-limit on auth and upload endpoints to prevent abuse
4. **Admin Presence**: Show which admin is currently reviewing a document to prevent duplicate work

## How to run it

### Prerequisites

- Node.js 20+, pnpm 9+, Docker

### Setup

```bash
# 1. Start infrastructure (PostgreSQL on port 5480, Redis on port 6390)
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your R2 credentials and JWT secret

# 4. Setup database
pnpm db:migrate
pnpm db:seed

# 5. Start all services
pnpm dev
```

This starts:
- Frontend: http://localhost:3050
- Backend: http://localhost:3051
- Mock Service: http://localhost:3052

### Production deployment

- **Frontend**: https://kvy-doc.chatminal.com
- **Backend API**: https://kvy-api.chatminal.com
- **Infrastructure**: Coolify (self-hosted PaaS) + Cloudflare Tunnel + Traefik

### Test credentials

- **Seller**: seller@kvy.com / password123
- **Admin**: admin@kvy.com / password123

### Running tests

```bash
pnpm --filter backend test
```

### User flow

1. Login as seller at /login
2. Upload a document (PDF/PNG/JPG, max 10MB)
3. Dashboard shows verification status in real-time
4. After 2–10 seconds, mock service responds: verified (40%), rejected (30%), or inconclusive (30%)
5. If inconclusive, document auto-transitions to "Under Review" for admin
6. Login as admin → Pending Reviews shows documents needing manual review
7. Admin approves/rejects with a reason → seller is notified
