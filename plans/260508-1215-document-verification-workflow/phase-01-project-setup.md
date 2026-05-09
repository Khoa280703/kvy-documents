# Phase 1: Project Setup

## Context
- [DESIGN.md](../../DESIGN.md) — Section 3 (Architecture), Section 4 (Stack Decisions)
- Critical foundation — all other phases depend on this

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2h
- **Description:** Initialize pnpm monorepo, configure TypeScript, set up Prisma schema with PostgreSQL, Docker Compose for local dev (PostgreSQL + Redis), shared types package.

## Key Insights
- pnpm workspaces chosen over Turborepo — simpler for take-home scope
- Shared types package eliminates type duplication between FE/BE
- Docker Compose provides reproducible local dev environment

## Requirements

### Functional
- Monorepo with 4 packages: shared, backend, frontend, mock-service
- PostgreSQL database with Prisma schema matching DESIGN.md data model
- Redis available for BullMQ + Socket.IO
- Seed script for initial users

### Non-Functional
- TypeScript strict mode across all packages
- Hot-reload in dev for all packages
- Single `pnpm dev` command starts everything

## Architecture

```
kvy/
├── package.json              # workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml        # PostgreSQL + Redis
├── .env.example
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types.ts          # User, Document, AuditLog, Notification
│   │       ├── enums.ts          # DocumentStatus, UserRole, ActorType
│   │       └── constants.ts      # FILE_SIZE_LIMIT, ALLOWED_FILE_TYPES, etc.
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       └── index.ts
│   ├── frontend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── app/
│   │           └── page.tsx
│   └── mock-service/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
```

## Related Code Files

### Files to Create
- `package.json` (root) — pnpm workspace config, dev/build scripts
- `pnpm-workspace.yaml` — workspace packages declaration
- `docker-compose.yml` — PostgreSQL 16 + Redis 7
- `.env.example` — all env vars documented
- `.gitignore`
- `packages/shared/` — full package with types/enums/constants
- `packages/backend/` — Express skeleton + Prisma
- `packages/frontend/` — Next.js App Router skeleton
- `packages/mock-service/` — minimal Express skeleton
- `packages/backend/prisma/schema.prisma` — full data model
- `packages/backend/prisma/seed.ts` — seed admin + seller users

## Implementation Steps

### 1. Initialize monorepo root
```bash
pnpm init
```
- Create `pnpm-workspace.yaml` with `packages/*`
- Add root scripts: `dev`, `build`, `db:migrate`, `db:seed`, `db:reset`

### 2. Create Docker Compose
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: kvy_verification
      POSTGRES_USER: kvy
      POSTGRES_PASSWORD: kvy_dev
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pgdata:
```

### 3. Create shared package
- `enums.ts`: `DocumentStatus` (pending_upload, pending_verification, verified, rejected, inconclusive, pending_review, approved, expired), `UserRole` (seller, admin), `ActorType` (system, seller, admin)
- `types.ts`: Interfaces for API request/response types, shared DTOs
- `constants.ts`: `MAX_FILE_SIZE = 10 * 1024 * 1024`, `ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg']`, `VERIFICATION_TIMEOUT_MS = 24 * 60 * 60 * 1000`

### 4. Create backend package
- `pnpm add express cors helmet cookie-parser @prisma/client bullmq socket.io zod jsonwebtoken bcrypt`
- `pnpm add -D prisma typescript tsx @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcrypt`
- Configure `tsconfig.json` with strict mode, path aliases to shared
- Create minimal `src/index.ts` with Express app + health check endpoint

### 5. Create Prisma schema
Match DESIGN.md Section 3.3 exactly:
- `users` table: id (uuid, default), email (unique), password_hash, role (enum), name, created_at, updated_at
- `documents` table: id, seller_id (FK users), file_key, file_name, file_type, file_size, status (enum), version (default 1), reviewed_by (FK users nullable), review_reason, rejection_reason, submitted_at, verified_at, reviewed_at, created_at, updated_at
- `audit_logs` table: id, document_id (FK), actor_id (FK nullable), actor_type (enum), action, metadata (Json), created_at
- `notifications` table: id, user_id (FK), document_id (FK), type, message, is_read (default false), created_at
- Add indexes: documents(seller_id), documents(status), audit_logs(document_id), notifications(user_id, is_read)

### 6. Create seed script
```typescript
// packages/backend/prisma/seed.ts
// Seed 2 users:
// seller@kvy.com / password123 (role: seller)
// admin@kvy.com / password123 (role: admin)
// Use bcrypt to hash passwords
```

### 7. Create frontend package
```bash
npx create-next-app@latest packages/frontend --typescript --app --tailwind --eslint --src-dir
```
- Configure to use shared package
- Set up API base URL from env

### 8. Create mock-service package
- Minimal Express app on port 3002
- Placeholder route `POST /verify`

### 9. Create .env.example
```env
# Database
DATABASE_URL=postgresql://kvy:kvy_dev@localhost:5432/kvy_verification

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=kvy-documents
R2_PUBLIC_URL=

# Mock Service
MOCK_SERVICE_URL=http://localhost:3002
WEBHOOK_BASE_URL=http://localhost:3001

# App
BACKEND_PORT=3001
FRONTEND_PORT=3000
MOCK_SERVICE_PORT=3002
```

### 10. Verify setup
```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev  # all 3 services start
```

## Todo List
- [ ] Init pnpm workspace root
- [ ] Create docker-compose.yml
- [ ] Create shared package with types/enums/constants
- [ ] Create backend package skeleton
- [ ] Write Prisma schema with all 4 tables
- [ ] Write seed script (seller + admin)
- [ ] Run first migration, verify schema
- [ ] Create frontend package (Next.js)
- [ ] Create mock-service package skeleton
- [ ] Create .env.example
- [ ] Verify `pnpm dev` starts all services

## Success Criteria
- `docker compose up -d` starts PostgreSQL + Redis
- `pnpm db:migrate` creates all tables
- `pnpm db:seed` creates 2 users
- `pnpm dev` starts backend(:3001), frontend(:3000), mock-service(:3002)
- `GET /health` on backend returns 200
- Shared types importable from backend and frontend

## Risk Assessment
- **Risk:** Prisma schema mismatch with DESIGN.md data model
  - **Mitigation:** Copy enums/fields exactly from DESIGN.md Section 3.3
- **Risk:** pnpm workspace resolution issues with shared package
  - **Mitigation:** Use `workspace:*` protocol in package.json dependencies
