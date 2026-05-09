# Phase 6: Admin UI

## Context
- [DESIGN.md](../../DESIGN.md) — Section 3.4 (State Machine), Section 6 (F4: concurrent admin review)
- Depends on: Phase 2 (auth), Phase 4 (verification workflow)
- Can be built in parallel with Phase 5 (Seller UI)

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2.5h
- **Description:** Admin-facing pages: login (shared), pending review queue, document review page with approve/reject, audit history view.

## Key Insights
- Admin only sees documents in `pending_review` state (inconclusive results)
- Review page shows document metadata + file preview (if image) or download link (if PDF)
- Optimistic locking: send `version` with review decision, 409 if stale
- Admin presence/locking added in Phase 7 (Socket.IO)

## Requirements

### Functional
- Admin dashboard at `/admin/dashboard` — pending review queue
- Document review at `/admin/review/:id` — document details + approve/reject form
- Audit history at `/admin/audit` — filterable audit log view
- Approve/reject with reason (required for reject, optional for approve)
- Handle 409 Conflict gracefully (show "already reviewed" message)

### Non-Functional
- Show reviewer count/presence on review page (Phase 7 adds real-time)
- Paginated audit log
- Clear visual distinction between admin and seller UI

## Related Code Files

### Files to Create
- `packages/frontend/src/app/admin/layout.tsx` — admin layout with nav
- `packages/frontend/src/app/admin/dashboard/page.tsx` — pending review queue
- `packages/frontend/src/app/admin/review/[id]/page.tsx` — document review page
- `packages/frontend/src/app/admin/audit/page.tsx` — audit history
- `packages/frontend/src/components/review-form.tsx` — approve/reject form
- `packages/frontend/src/components/audit-log-table.tsx` — audit log display
- `packages/frontend/src/components/document-detail-card.tsx` — document metadata card

### Backend Routes to Create (if not in Phase 4)
- `GET /api/admin/pending-reviews` — documents with status pending_review
- `GET /api/admin/audit-logs` — paginated, filterable audit logs
- `GET /api/documents/:id/audit-logs` — audit logs for specific document

## Implementation Steps

### 1. Create admin layout
```typescript
// packages/frontend/src/app/admin/layout.tsx
// Auth guard — redirect to /login if not authenticated
// Role guard — redirect to /seller if seller user
// Nav: Dashboard | Audit History | Logout
```

### 2. Create admin dashboard (pending review queue)
```typescript
// packages/frontend/src/app/admin/dashboard/page.tsx
// Fetch GET /api/admin/pending-reviews
// List documents needing review
// Each item: seller name, file name, submitted date, time waiting
// Click → navigate to /admin/review/:id
// Empty state: "No documents pending review"
// Show count badge in nav
```

### 3. Create document detail card
```typescript
// packages/frontend/src/components/document-detail-card.tsx
// Shows: file name, file type, file size, seller name, seller email
// Submitted at, current status, verification history timeline
// If image (PNG/JPG): inline preview via R2 URL
// If PDF: download link
```

### 4. Create review form
```typescript
// packages/frontend/src/components/review-form.tsx
// Two buttons: Approve (green) | Reject (red)
// Reason text area (required for reject)
// Confirm dialog before submission
// Sends POST /api/documents/:id/review with { action, reason, version }
// Handle 409: show "This document was already reviewed by another admin"
// Handle success: redirect to dashboard with success toast
```

### 5. Create review page
```typescript
// packages/frontend/src/app/admin/review/[id]/page.tsx
// Fetch GET /api/documents/:id (includes audit history)
// Display document detail card
// Display review form
// Display audit log timeline for this document
// Placeholder for reviewer presence indicator (Phase 7)
```

### 6. Create audit log table
```typescript
// packages/frontend/src/components/audit-log-table.tsx
// Columns: timestamp, document, actor, action, metadata
// Sortable by timestamp
// Filterable by action type
```

### 7. Create audit history page
```typescript
// packages/frontend/src/app/admin/audit/page.tsx
// Fetch GET /api/admin/audit-logs?page=1&limit=20
// Display audit log table with pagination
// Filter by: action type, date range
```

### 8. Add backend routes for admin
```typescript
// packages/backend/src/routes/admin-routes.ts (extend from Phase 4)

// GET /api/admin/pending-reviews
// Returns documents with status: pending_review
// Include seller info (join)
// Order by submitted_at ASC (oldest first)

// GET /api/admin/audit-logs?page&limit&action&from&to
// Paginated, filterable audit logs
// Include document + actor info (joins)

// GET /api/documents/:id/audit-logs
// All audit logs for a specific document
// Ordered by created_at ASC
```

## Todo List
- [ ] Create admin layout with auth + role guard
- [ ] Create admin dashboard (pending review queue)
- [ ] Create document detail card component
- [ ] Create review form with approve/reject
- [ ] Create review page combining detail + form + audit
- [ ] Create audit log table component
- [ ] Create audit history page with pagination
- [ ] Add backend routes: pending-reviews, audit-logs
- [ ] Test admin flow: login → see queue → review → approve/reject
- [ ] Test 409 conflict handling

## Success Criteria
- Admin can login and see pending review queue
- Admin can view document details and audit history
- Admin can approve with optional reason
- Admin can reject with required reason
- 409 Conflict shows user-friendly message
- Audit history page shows all system events
- Seller users cannot access admin pages

## Risk Assessment
- **Risk:** Document preview CORS from R2
  - **Mitigation:** R2 bucket CORS must allow GET from frontend origin
- **Risk:** Large audit log tables slow to render
  - **Mitigation:** Server-side pagination, limit 20 per page
