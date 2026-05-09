# Phase 3: File Upload + Mock Service

## Context
- [DESIGN.md](../../DESIGN.md) — Section 3.4 (State Machine), Section 6 (F3: large file, F7: presigned URL expiry)
- Depends on: Phase 1 (database, R2 config)
- This phase covers TWO concerns: R2 upload flow AND the separate mock verification service

## Overview
- **Priority:** P1
- **Status:** complete
- **Effort:** 2.5h
- **Description:** Implement presigned URL upload to R2, upload confirmation endpoint, file validation. Build separate mock verification micro-service with webhook callback pattern.

## Key Insights
- Presigned URL pattern: backend generates URL → frontend uploads directly to R2 → frontend confirms upload to backend
- Mock service is a separate Express app (port 3002) — mirrors real-world third-party integration
- Mock returns random result (verified/rejected/inconclusive) after random delay (2-10s for demo)

## Requirements

### Functional — File Upload
- `POST /api/documents/upload-url` — creates document record (pending_upload), returns presigned PUT URL
- `POST /api/documents/:id/confirm-upload` — seller confirms file uploaded to R2, transitions to pending_verification
- File validation: PDF/PNG/JPG only, max 10MB (enforced in presigned URL conditions)
- Only sellers can upload. One active verification at a time per seller.

### Functional — Mock Service
- `POST /verify` — receives { documentId, callbackUrl, fileKey }
- After random delay (2-10s), POST to callbackUrl with { documentId, status, reason }
- Status randomly chosen: verified (40%), rejected (30%), inconclusive (30%)
- Validate incoming request with Zod

### Non-Functional
- Presigned URL expiry: 30 minutes
- R2 SDK: @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner (S3-compatible)

## Related Code Files

### Files to Create
- `packages/backend/src/routes/document-routes.ts` — upload-url, confirm-upload
- `packages/backend/src/services/r2-service.ts` — presigned URL generation
- `packages/backend/src/services/document-service.ts` — document CRUD + validation
- `packages/mock-service/src/index.ts` — full mock service implementation
- `packages/shared/src/webhook-types.ts` — VerificationRequest, VerificationCallback types

### Files to Modify
- `packages/backend/src/index.ts` — register document routes

## Implementation Steps

### 1. Create R2 service
```typescript
// packages/backend/src/services/r2-service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3Client with R2 endpoint
// generatePresignedUrl(fileKey, contentType, maxSize) → returns signed PUT URL
// File key format: `documents/${documentId}/${originalFileName}`
```

### 2. Create document service
```typescript
// packages/backend/src/services/document-service.ts
// createDocument(sellerId, fileName, fileType, fileSize) → Document
//   - Validate file type against ALLOWED_FILE_TYPES
//   - Validate file size against MAX_FILE_SIZE
//   - Check no active pending verification for seller
//   - Create document record with status: pending_upload
//   - Create audit log: action "document_created"

// confirmUpload(documentId, sellerId) → Document
//   - Verify document exists, belongs to seller, status is pending_upload
//   - Update status to pending_verification
//   - Set submitted_at = now
//   - Create audit log: action "file_uploaded"
//   - Return updated document (caller will enqueue BullMQ job)
```

### 3. Create document routes
```typescript
// packages/backend/src/routes/document-routes.ts

// POST /api/documents/upload-url
// Auth: requireRole('seller')
// Body: { fileName, fileType, fileSize }
// Validate with Zod
// Call documentService.createDocument()
// Call r2Service.generatePresignedUrl()
// Return { documentId, uploadUrl }

// POST /api/documents/:id/confirm-upload
// Auth: requireRole('seller')
// Call documentService.confirmUpload()
// Enqueue verification job (Phase 4 integration point)
// Return updated document

// GET /api/documents
// Auth: requireAuth
// Seller: return own documents
// Admin: return all documents (with filters)

// GET /api/documents/:id
// Auth: requireAuth
// Seller: own document only
// Admin: any document
```

### 4. Build mock verification service
```typescript
// packages/mock-service/src/index.ts
import express from 'express';

const app = express();
app.use(express.json());

app.post('/verify', async (req, res) => {
  // Validate request: { documentId, callbackUrl, fileKey }
  // Respond 202 Accepted immediately
  // After random delay (2-10s), POST callback:
  const results = ['verified', 'rejected', 'inconclusive'];
  const weights = [0.4, 0.3, 0.3];
  // Pick weighted random result
  // POST to callbackUrl: { documentId, status, reason }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(3002);
```

### 5. Create shared webhook types
```typescript
// packages/shared/src/webhook-types.ts
export interface VerificationRequest {
  documentId: string;
  callbackUrl: string;
  fileKey: string;
}
export interface VerificationCallback {
  documentId: string;
  status: 'verified' | 'rejected' | 'inconclusive';
  reason?: string;
}
```

### 6. Register document routes
```typescript
// packages/backend/src/index.ts
app.use('/api/documents', requireAuth, documentRoutes);
```

## Todo List
- [ ] Create R2 service with presigned URL generation
- [ ] Create document service (create, confirmUpload, list, get)
- [ ] Create document routes with Zod validation
- [ ] Build mock verification service (POST /verify with random delay + result)
- [ ] Create shared webhook types
- [ ] Register document routes in Express app
- [ ] Test upload flow: get URL → upload to R2 → confirm
- [ ] Test mock service: POST /verify → webhook callback fires

## Success Criteria
- `POST /api/documents/upload-url` returns presigned URL + document ID
- File can be uploaded directly to R2 via presigned URL
- `POST /api/documents/:id/confirm-upload` transitions status to pending_verification
- Mock service responds 202 immediately, then calls webhook after delay
- File type/size validation rejects invalid files
- Seller cannot have multiple pending verifications

## Risk Assessment
- **Risk:** R2 credentials not available in dev
  - **Mitigation:** Use MinIO in Docker Compose as local S3-compatible fallback, or use filesystem mock
- **Risk:** Mock service callback URL not reachable in production
  - **Mitigation:** Use WEBHOOK_BASE_URL env var, ensure mock service can reach backend

## Security Considerations
- Presigned URLs have Content-Length conditions to prevent abuse
- Only authenticated sellers can request upload URLs
- Document ownership verified before confirm-upload
- File key includes documentId to prevent path traversal
