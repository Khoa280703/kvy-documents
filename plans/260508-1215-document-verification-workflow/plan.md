---
title: "Document Verification Workflow"
description: "Full-stack take-home: monorepo with Express API, Next.js UI, BullMQ workflow, mock verification service"
status: complete
priority: P1
effort: 19h
branch: main
tags: [take-home, full-stack, verification, workflow]
created: 2026-05-08
---

# Document Verification Workflow - Implementation Plan

## Overview

Build a document verification pipeline for seller onboarding. Sellers upload docs, system dispatches to mock external service via BullMQ, handles verified/rejected/inconclusive results, routes inconclusive to admin review, real-time notifications via Socket.IO.

**Key deliverables:** DESIGN.md (done), working code, README.md, deployed app.

## Monorepo Structure

```
packages/
  shared/        — TypeScript types, enums, constants
  backend/       — Express + Prisma + BullMQ + Socket.IO
  frontend/      — Next.js App Router
  mock-service/  — Standalone verification mock
docker-compose.yml — PostgreSQL + Redis
```

## Phases

| # | Phase | Effort | Status | Depends On |
|---|-------|--------|--------|------------|
| 1 | [Project Setup](./phase-01-project-setup.md) | 2h | complete | - |
| 2 | [Auth](./phase-02-auth.md) | 2h | complete | 1 |
| 3 | [File Upload + Mock Service](./phase-03-file-upload-mock-service.md) | 2.5h | complete | 1 |
| 4 | [Verification Workflow](./phase-04-verification-workflow.md) | 3h | complete | 2, 3 |
| 5 | [Seller UI](./phase-05-seller-ui.md) | 2.5h | complete | 2, 4 |
| 6 | [Admin UI](./phase-06-admin-ui.md) | 2.5h | complete | 2, 4 |
| 7 | [Socket.IO Real-time](./phase-07-socketio-realtime.md) | 2h | complete | 5, 6 |
| 8 | [Testing + Error Handling + Deploy](./phase-08-testing-deploy.md) | 2.5h | complete | 7 |

## Critical Path

```
1 → 2 → 3 → 4 → 5/6 (parallel) → 7 → 8
```

## Quality Requirements (from brief)

- At least 1 complete E2E path working
- Input validation on backend
- Error handling that doesn't leak internals
- At least 1 meaningful test for core verification flow
- No secrets in repo (.env.example provided)
- Deployed at public URL
- README with "What I built", "What I'd build next", "How to run it"
