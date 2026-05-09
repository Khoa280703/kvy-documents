# Phase 5: Seller UI

## Context
- [DESIGN.md](../../DESIGN.md) — Section 3.1 (Client Layer), stakeholder needs
- Depends on: Phase 2 (auth), Phase 4 (verification workflow)
- Can be built in parallel with Phase 6 (Admin UI)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2.5h
- **Description:** Seller-facing pages: login, document upload form, verification status dashboard. Next.js App Router with role-based routing.

## Key Insights
- Seller flow is simple: login → upload → wait → see result
- Status dashboard shows current + historical verification attempts
- Real-time updates added in Phase 7 (Socket.IO)
- Use Next.js App Router with route groups for role separation

## Requirements

### Functional
- Login page at `/login`
- Seller dashboard at `/seller/dashboard` — shows current verification status + history
- Upload form at `/seller/upload` — file picker with validation, upload progress
- Status display with clear visual indicators per state
- Redirect to login if unauthenticated, to role-appropriate page after login

### Non-Functional
- Responsive design (Tailwind CSS)
- Loading states, error states, empty states
- Client-side file validation before upload

## Architecture

```
packages/frontend/src/app/
├── layout.tsx                    # Root layout
├── page.tsx                      # Redirect to /login or dashboard
├── login/
│   └── page.tsx                  # Shared login page
├── seller/
│   ├── layout.tsx                # Seller layout with nav
│   ├── dashboard/
│   │   └── page.tsx              # Verification status + history
│   └── upload/
│       └── page.tsx              # Upload form
├── admin/                        # Phase 6
```

## Related Code Files

### Files to Create
- `packages/frontend/src/app/login/page.tsx` — login form
- `packages/frontend/src/app/seller/layout.tsx` — seller layout with sidebar/nav
- `packages/frontend/src/app/seller/dashboard/page.tsx` — status dashboard
- `packages/frontend/src/app/seller/upload/page.tsx` — upload form
- `packages/frontend/src/lib/api-client.ts` — fetch wrapper with credentials
- `packages/frontend/src/lib/auth-context.tsx` — auth state provider
- `packages/frontend/src/components/status-badge.tsx` — document status indicator
- `packages/frontend/src/components/file-upload-form.tsx` — upload form component
- `packages/frontend/src/components/document-list.tsx` — document history list
- `packages/frontend/src/hooks/use-auth.ts` — auth hook (login, logout, user state)

## Implementation Steps

### 1. Create API client
```typescript
// packages/frontend/src/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // send cookies
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message);
  }
  return res.json();
}
```

### 2. Create auth context + hook
```typescript
// packages/frontend/src/lib/auth-context.tsx
// React context providing: user, login(), logout(), isLoading
// On mount: call GET /api/auth/me to check session
// On login: POST /api/auth/login, then redirect based on role
// On logout: POST /api/auth/logout, redirect to /login
```

### 3. Create login page
```typescript
// packages/frontend/src/app/login/page.tsx
// Simple form: email + password
// On submit: call login() from auth context
// Redirect to /seller/dashboard or /admin/dashboard based on role
// Show error message on failure
// Display test credentials for convenience
```

### 4. Create seller layout
```typescript
// packages/frontend/src/app/seller/layout.tsx
// Check auth — redirect to /login if not authenticated
// Check role — redirect to /admin if admin user
// Simple nav: Dashboard | Upload | Logout
```

### 5. Create upload form component
```typescript
// packages/frontend/src/components/file-upload-form.tsx
// 1. File picker with drag-and-drop (optional, click works)
// 2. Client-side validation: type (PDF/PNG/JPG), size (≤10MB)
// 3. On submit:
//    a. POST /api/documents/upload-url → get { documentId, uploadUrl }
//    b. PUT to uploadUrl (R2 presigned) with file blob
//    c. POST /api/documents/:id/confirm-upload
//    d. Redirect to dashboard
// 4. Show upload progress bar
// 5. Show error messages
```

### 6. Create status badge component
```typescript
// packages/frontend/src/components/status-badge.tsx
// Map each DocumentStatus to color + label:
// pending_upload → gray "Pending Upload"
// pending_verification → yellow "Verifying..."
// verified → green "Verified"
// rejected → red "Rejected"
// inconclusive → orange "Under Review"
// pending_review → orange "Under Review"
// approved → green "Approved"
// expired → gray "Expired"
```

### 7. Create seller dashboard
```typescript
// packages/frontend/src/app/seller/dashboard/page.tsx
// Fetch GET /api/documents (seller's own docs)
// Show current/latest verification status prominently
// List historical verification attempts
// Each item: file name, status badge, submitted date, result reason
// Empty state: "No documents uploaded yet" + link to upload
// CTA: "Upload New Document" (only if no pending verification)
```

### 8. Create document list component
```typescript
// packages/frontend/src/components/document-list.tsx
// Reusable list of document cards
// Each card: file name, status badge, timestamps, reason (if rejected)
```

## Todo List
- [ ] Create API client with credentials
- [ ] Create auth context + useAuth hook
- [ ] Create login page
- [ ] Create seller layout with auth guard
- [ ] Create file upload form with validation + progress
- [ ] Create status badge component
- [ ] Create seller dashboard page
- [ ] Create document list component
- [ ] Test full seller flow: login → upload → see status

## Success Criteria
- Seller can login with seeded credentials
- Upload form validates file type/size client-side
- File uploads to R2 via presigned URL
- Dashboard shows document status with appropriate visual indicator
- Historical verification attempts are listed
- Unauthenticated users redirected to login
- Admin users redirected away from seller pages

## Risk Assessment
- **Risk:** CORS issues with presigned URL PUT to R2
  - **Mitigation:** R2 bucket CORS config must allow PUT from frontend origin
- **Risk:** Upload progress not available with fetch API
  - **Mitigation:** Use XMLHttpRequest for upload to get progress events, or accept no progress bar
