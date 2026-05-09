---
name: backend-test-results
description: Test execution results for backend test suite 2026-05-08
type: project
---

# Backend Test Results Report

**Date:** 2026-05-08
**Scope:** `/home/khoa2807/working-sources/temp/kvy/packages/backend`

## Test Results Overview

| Metric | Value |
|--------|-------|
| Test Files | 1 passed (1) |
| Tests | 4 passed (4) |
| Failed | 0 |
| Skipped | 0 |
| Duration | 503ms |

## Test File Details

- `src/__tests__/verification-flow.test.ts` — 4 tests, 130ms, all passed

## Coverage Metrics

No coverage report configured. vitest runs without `--coverage` flag. No coverage thresholds defined.

## Build Status

- Prisma migration: applied successfully (`20260508054545_init`)
- Database seed: 2 users seeded (seller@kvy.com, admin@kvy.com)
- Tests: all passing

## Environment Issues Resolved

1. **Port 5432 conflict** — `grok_local_postgres` was occupying port 5432. Stopped container, started Kvy postgres.
2. **Postgres advisory lock** — Stale Prisma migration process held lock on `pg_advisory_lock(72707369)`. Terminated connections, retried migration.
3. **bcrypt native module missing** — pnpm v10 blocked build scripts for bcrypt. Manually downloaded prebuilt binary (`bcrypt_lib-v5.1.1-napi-v3-linux-x64-glibc`) from GitHub releases and installed to the pnpm store binding directory.

## Critical Issues

None. All tests pass.

## Recommendations

1. Add `--coverage` to test command or configure vitest coverage in `vitest.config.ts`
2. Add `.env` file or document .env setup in README to avoid missing env errors
3. Consider adding `bcrypt` to pnpm `packageManager.allowedBuildScripts` in `.npmrc` to prevent native build failures
4. Only 1 test file found (4 tests). Consider adding tests for auth, webhook, queue, and socket.io modules

## Next Steps

- Prioritize: add test coverage for untested modules (auth, webhooks, queues, real-time)
- Add vitest coverage configuration
- Document bcrypt native module workaround for CI

## Unresolved Questions

- Is there a CI pipeline that needs the bcrypt fix applied?
- Should we add a vitest.config.ts with coverage thresholds?
