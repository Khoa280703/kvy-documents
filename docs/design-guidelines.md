# KVY Document Verification — UI Design Brief

## Product Overview

Marketplace document verification platform. Two roles: **Seller** (uploads documents) and **Admin** (reviews inconclusive documents).

**Live URLs:**
- Frontend: https://kvy-doc.chatminal.com
- API: https://kvy-api.chatminal.com

**Tech:** Next.js App Router, Tailwind CSS, TypeScript

---

## Pages to Design

### 1. Login (`/login`)
- Shared login for seller & admin (auto-redirect by role)
- Fields: email, password
- Error state for invalid credentials

### 2. Seller Dashboard (`/seller/dashboard`)
- List of uploaded documents with status badges
- Each row links to document detail page
- Cancel button for `pending_upload` documents
- Empty state when no documents
- **Statuses:** Pending Upload, Pending Verification, Under Review, Verified, Approved, Rejected, Expired

### 3. Seller Document Detail (`/seller/documents/[id]`)
- Document info: file name, type, size, submitted date
- Status badge + reason (review/rejection)
- File preview (image inline, PDF iframe) and download via R2 presigned URL

### 4. Seller Upload (`/seller/upload`)
- File picker (drag & drop preferred)
- Allowed types: PDF, PNG, JPG, JPEG
- Max size: 10MB
- Upload progress indicator
- Success/error feedback

### 5. Admin Dashboard (`/admin/dashboard`)
- List of documents in `pending_review` status
- Each row: file name, seller name, seller email, submitted date
- Click to navigate to review page
- Counter showing total pending reviews
- Empty state

### 6. Admin Review Detail (`/admin/review/[id]`)
- Document info: file name, type, size, seller info, submitted date
- File preview (image/PDF) and download via R2 presigned URL
- Review form: approve/reject with required reason textarea
- Optimistic locking (version field)

### 7. Admin All Documents (`/admin/documents`)
- View all documents across all statuses
- Filter by status buttons
- Each row links to review detail page

### 8. Admin Audit Log (`/admin/audit`)
- Paginated table of all system events
- Columns: timestamp, action, document name, actor, details
- Pagination controls

---

## Shared Components

| Component | Description |
|-----------|-------------|
| **Status Badge** | Color-coded pill for each document status |
| **Notification Bell** | Real-time notification dropdown (Socket.IO) |
| **Seller Layout** | Sidebar/topbar nav: Dashboard, Upload, Logout |
| **Admin Layout** | Sidebar/topbar nav: Pending Reviews, Audit Log, Logout |

---

## Status Color Mapping (current)

| Status | Color |
|--------|-------|
| Pending Upload | Gray |
| Pending Verification | Blue |
| Under Review (inconclusive/pending_review) | Orange |
| Verified | Green |
| Approved | Green |
| Rejected | Red |
| Expired | Gray dark |

---

## Design Constraints

- **Responsive:** Desktop-first, flexible mobile
- **Framework:** Tailwind CSS 
- **No external UI library** shadcn/ui, Radix, etc
- **Dark mode:** Not compusary 

---

