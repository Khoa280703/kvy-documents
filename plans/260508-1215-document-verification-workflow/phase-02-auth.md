# Phase 2: Auth

## Context
- [DESIGN.md](../../DESIGN.md) — Section 4 (JWT decision), Section 5 (Decision 5: JWT vs sessions)
- Depends on: Phase 1 (database, user model)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2h
- **Description:** JWT auth with httpOnly cookies, login endpoint, auth middleware, role-based guards. No registration — users are seeded.

## Key Insights
- Stateless JWT chosen for cross-origin FE/BE architecture
- httpOnly cookie prevents XSS token theft
- Role embedded in JWT claims — no DB lookup per request
- No registration endpoint needed — users are seeded (seller + admin)

## Requirements

### Functional
- `POST /api/auth/login` — email + password, returns JWT in httpOnly cookie
- `POST /api/auth/logout` — clears cookie
- `GET /api/auth/me` — returns current user (from JWT)
- Auth middleware extracts + verifies JWT from cookie
- Role guard middleware (`requireRole('admin')`, `requireRole('seller')`)

### Non-Functional
- JWT expiry: 7 days
- Password hashed with bcrypt (cost factor 10)
- Cookie: httpOnly, secure (prod), sameSite: lax, path: /

## Related Code Files

### Files to Create
- `packages/backend/src/middleware/auth-middleware.ts` — JWT verification, attach user to req
- `packages/backend/src/middleware/role-guard.ts` — role-based access control
- `packages/backend/src/routes/auth-routes.ts` — login, logout, me
- `packages/backend/src/utils/jwt-utils.ts` — sign, verify helpers
- `packages/shared/src/api-types.ts` — LoginRequest, LoginResponse, UserResponse

### Files to Modify
- `packages/backend/src/index.ts` — register auth routes, cookie-parser

## Implementation Steps

### 1. Create JWT utilities
```typescript
// packages/backend/src/utils/jwt-utils.ts
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: 'seller' | 'admin';
}

export function signToken(payload: JwtPayload): string
export function verifyToken(token: string): JwtPayload
```

### 2. Create auth middleware
```typescript
// packages/backend/src/middleware/auth-middleware.ts
// Extract JWT from req.cookies.token
// Verify with verifyToken()
// Attach decoded payload to req.user
// Return 401 if missing/invalid
```

### 3. Create role guard
```typescript
// packages/backend/src/middleware/role-guard.ts
export function requireRole(...roles: UserRole[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json(...)
    next();
  }
}
```

### 4. Create auth routes
```typescript
// POST /api/auth/login
// - Validate input with Zod (email, password required)
// - Find user by email
// - Compare password with bcrypt
// - Sign JWT with userId, email, role
// - Set httpOnly cookie
// - Return user info (no password_hash)

// POST /api/auth/logout
// - Clear cookie

// GET /api/auth/me
// - requireAuth middleware
// - Return req.user info from DB (fresh, not just JWT claims)
```

### 5. Register routes in Express app
```typescript
// packages/backend/src/index.ts
import cookieParser from 'cookie-parser';
import cors from 'cors';

app.use(cookieParser());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use('/api/auth', authRoutes);
```

### 6. Add shared API types
```typescript
// packages/shared/src/api-types.ts
export interface LoginRequest { email: string; password: string; }
export interface UserResponse { id: string; email: string; role: UserRole; name: string; }
```

## Todo List
- [ ] Create jwt-utils.ts (sign/verify)
- [ ] Create auth-middleware.ts
- [ ] Create role-guard.ts
- [ ] Create auth-routes.ts (login, logout, me)
- [ ] Register routes + cookie-parser in Express app
- [ ] Add CORS config with credentials
- [ ] Add shared API types
- [ ] Test login with seeded users via curl/Postman

## Success Criteria
- `POST /api/auth/login` with valid credentials returns 200 + sets cookie
- `POST /api/auth/login` with invalid credentials returns 401
- `GET /api/auth/me` with valid cookie returns user info
- `GET /api/auth/me` without cookie returns 401
- Admin-only routes reject seller tokens (403)
- Seller-only routes reject admin tokens (403)

## Risk Assessment
- **Risk:** CORS issues between Next.js (3000) and Express (3001)
  - **Mitigation:** Set `credentials: true` in CORS config, set `FRONTEND_URL` env var
- **Risk:** Cookie not sent cross-origin
  - **Mitigation:** Use `sameSite: 'lax'`, ensure same domain or proper CORS headers
