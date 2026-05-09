# Phase 8: Testing + Error Handling + Deploy

## Context
- [DESIGN.md](../../DESIGN.md) — Section 6 (Failure Modes), Section 7 (Descoped: D5)
- Depends on: Phase 7 (all features complete)
- Final phase — polish, test, deploy

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2.5h
- **Description:** Add at least 1 meaningful integration test for core verification flow, input validation across all endpoints, centralized error handling, deploy to Coolify + Cloudflare, write README.md.

## Key Insights
- Brief requires "at least one meaningful test covering the core behavior"
- Focus test on the state machine / verification flow (highest value)
- Error handling should never leak stack traces or internal details
- README is a graded artifact — "What I built", "What I'd build next", "How to run it"

## Requirements

### Functional — Testing
- Integration test: upload → BullMQ dispatch → webhook callback → state transition → audit log
- Test admin review with optimistic locking (happy path + conflict)
- Test invalid state transitions are rejected

### Functional — Error Handling
- Centralized error handler middleware (no stack traces in prod)
- Zod validation on all API inputs
- Consistent error response format: `{ error: string, details?: unknown }`
- 400 for validation errors, 401 for auth, 403 for role, 404 for not found, 409 for conflict, 500 for unexpected

### Functional — Deployment
- Deploy backend + mock-service on Coolify
- Deploy frontend on Coolify (or Vercel)
- PostgreSQL + Redis on Coolify
- Cloudflare R2 bucket with CORS configured
- Environment variables configured
- Health check endpoints working

### Functional — README
- "What I built" — honest assessment of working features
- "What I'd build next" — 2-hour roadmap
- "How to run it" — local setup instructions, Docker Compose, env vars
- Test credentials (seller@kvy.com, admin@kvy.com)
- Deployed URL

## Related Code Files

### Files to Create
- `packages/backend/src/middleware/error-handler.ts` — centralized error handling
- `packages/backend/src/utils/app-error.ts` — custom error class
- `packages/backend/src/__tests__/verification-flow.test.ts` — core integration test
- `README.md` — project documentation
- `.env.example` — finalize all env vars

### Files to Modify
- `packages/backend/src/index.ts` — add error handler middleware
- All route files — ensure Zod validation on inputs
- `docker-compose.yml` — production-ready config if needed

## Implementation Steps

### 1. Create custom error class
```typescript
// packages/backend/src/utils/app-error.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
// Factory methods: AppError.badRequest(), AppError.unauthorized(), etc.
```

### 2. Create error handler middleware
```typescript
// packages/backend/src/middleware/error-handler.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.flatten() });
  }
  // Log unexpected errors, return generic message
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}
```

### 3. Write core verification flow test
```typescript
// packages/backend/src/__tests__/verification-flow.test.ts
// Use vitest or jest
// Setup: connect to test DB, seed test user

// Test 1: "Complete verification flow — verified"
//   1. Create document record (status: pending_upload)
//   2. Confirm upload → status becomes pending_verification
//   3. Simulate webhook callback with status: verified
//   4. Assert document status is verified
//   5. Assert audit logs contain: document_created, file_uploaded, status_verified

// Test 2: "Inconclusive → admin review → approved"
//   1. Create + confirm upload
//   2. Webhook callback: inconclusive
//   3. Assert status is pending_review
//   4. Admin approves with version
//   5. Assert status is approved
//   6. Assert notification created for seller

// Test 3: "Optimistic lock conflict"
//   1. Create document in pending_review state
//   2. Admin A approves with version 1 → success
//   3. Admin B tries to reject with version 1 → 409 Conflict

// Test 4: "Invalid state transition rejected"
//   1. Create document in verified state
//   2. Attempt to transition to pending_review → error
```

### 4. Add input validation to all routes
Review each route file and ensure:
- Zod schema for request body
- Zod schema for query parameters
- UUID format validation for path params
- Use `z.string().uuid()` for IDs

### 5. Deploy to Coolify
```
Deployment architecture:
- Coolify project with 4 services:
  1. PostgreSQL (managed)
  2. Redis (managed)
  3. Backend + Mock Service (Node.js, Dockerfile)
  4. Frontend (Next.js, Dockerfile)

Dockerfile for backend:
  FROM node:20-alpine
  WORKDIR /app
  COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
  COPY packages/shared/ packages/shared/
  COPY packages/backend/ packages/backend/
  COPY packages/mock-service/ packages/mock-service/
  RUN npm i -g pnpm && pnpm install --frozen-lockfile
  RUN pnpm --filter shared build
  RUN pnpm --filter backend build
  RUN pnpm --filter mock-service build
  # Start both backend and mock-service
  CMD ["sh", "-c", "node packages/backend/dist/index.js & node packages/mock-service/dist/index.js"]

Dockerfile for frontend:
  FROM node:20-alpine
  WORKDIR /app
  COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
  COPY packages/shared/ packages/shared/
  COPY packages/frontend/ packages/frontend/
  RUN npm i -g pnpm && pnpm install --frozen-lockfile
  RUN pnpm --filter shared build
  RUN pnpm --filter frontend build
  CMD ["pnpm", "--filter", "frontend", "start"]
```

### 6. Configure R2 bucket
- Create bucket `kvy-documents` in Cloudflare R2
- CORS policy: allow GET/PUT from frontend origin
- Generate R2 API tokens for backend

### 7. Write README.md
```markdown
# Document Verification Workflow

## What I built
[Honest list of working features]

## What I'd build next
[2-hour priorities: comprehensive tests, email notifications, better error handling]

## How to run it

### Prerequisites
- Node.js 20+, pnpm 9+, Docker

### Setup
1. Clone repo
2. `cp .env.example .env`
3. `docker compose up -d`
4. `pnpm install`
5. `pnpm db:migrate`
6. `pnpm db:seed`
7. `pnpm dev`

### Test credentials
- Seller: seller@kvy.com / password123
- Admin: admin@kvy.com / password123

### Deployed URL
[URL]

## Architecture
[Link to DESIGN.md]
```

## Todo List
- [ ] Create AppError class
- [ ] Create centralized error handler middleware
- [ ] Add Zod validation to all route handlers
- [ ] Write verification flow integration test
- [ ] Run tests — ensure passing
- [ ] Create Dockerfiles for backend + frontend
- [ ] Deploy to Coolify
- [ ] Configure R2 CORS
- [ ] Set environment variables in Coolify
- [ ] Verify deployed app works E2E
- [ ] Write README.md
- [ ] Final .env.example review — no secrets

## Success Criteria
- At least 1 integration test passes for core verification flow
- All API endpoints validate input with Zod
- Error responses never leak stack traces
- App deployed and accessible at public URL
- Both E2E paths work: (1) upload → verified, (2) upload → inconclusive → admin review → approved
- README contains all required sections
- .env.example has all env vars documented
- No secrets in repository

## Risk Assessment
- **Risk:** Test database setup complexity
  - **Mitigation:** Use separate test DB, reset between tests with Prisma migrate reset
- **Risk:** Coolify deployment issues
  - **Mitigation:** Test Docker builds locally first, have Vercel as fallback for frontend
- **Risk:** R2 CORS misconfiguration
  - **Mitigation:** Test presigned URL upload from deployed frontend URL

## Security Considerations
- No secrets in .env.example
- Production JWT_SECRET must be strong random string
- CORS origin restricted to deployed frontend URL
- httpOnly cookies in production require HTTPS
