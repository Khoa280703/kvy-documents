# KVY Document Verification Workflow

## What I built

A full-stack document verification pipeline for seller onboarding:

- **Monorepo** (pnpm workspaces): shared types, Express API, Next.js UI, mock verification service
- **Auth**: JWT with httpOnly cookies, role-based access (seller/admin)
- **File Upload**: Presigned URL pattern with filesystem fallback for dev
- **Verification Workflow**: BullMQ async jobs dispatch to mock service, webhook callbacks trigger state machine transitions
- **State Machine**: 8 states with guarded transitions and optimistic locking
- **Admin Review**: Inconclusive results auto-route to admin queue with approve/reject
- **Real-time**: Socket.IO notifications on status changes, admin presence on review pages
- **Audit Trail**: Every state transition logged with actor, action, and metadata

## What I'd build next

1. **R2 Storage**: Replace filesystem fallback with Cloudflare R2 for production file storage
2. **Comprehensive Tests**: Add E2E tests with Playwright covering full upload-to-verification flow
3. **Email Notifications**: Send emails on status changes using Resend/AWS SES
4. **Document Preview**: PDF/image preview in admin review page using R2 presigned GET URLs
5. **Rate Limiting**: Express rate-limit on auth and upload endpoints

## How to run it

### Prerequisites

- Node.js 20+, pnpm 9+, Docker

### Setup

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
pnpm install

# 3. Setup database
pnpm db:migrate
pnpm db:seed

# 4. Start all services
pnpm dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Mock Service: http://localhost:3002

### Test credentials

- **Seller**: seller@kvy.com / password123
- **Admin**: admin@kvy.com / password123

### User flow

1. Login as seller at http://localhost:3000/login
2. Upload a document (PDF/PNG/JPG, max 10MB)
3. Dashboard shows "Verifying..." status
4. After 2-10 seconds, mock service responds: verified (40%), rejected (30%), or inconclusive (30%)
5. If inconclusive, login as admin and review at /admin/dashboard
