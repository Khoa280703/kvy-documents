import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth-middleware';
import { requireRole } from '../middleware/role-guard';
import { createDocument, confirmUpload, listDocuments, getDocument } from '../services/document-service';
import { generatePresignedUrl } from '../services/r2-service';
import { verificationQueue } from '../queues/verification-queue';
import { timeoutQueue } from '../queues/timeout-queue';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const uuidSchema = z.string().uuid();

router.post('/upload-url', requireAuth, requireRole('seller'), asyncHandler(async (req: Request, res: Response) => {
  const { fileName, fileType, fileSize } = z.object({ fileName: z.string(), fileType: z.string(), fileSize: z.number() }).parse(req.body);
  const doc = await createDocument({ sellerId: req.user!.userId, fileName, fileType, fileSize });
  const { url } = generatePresignedUrl(doc.file_key, fileType, fileSize);
  res.json({ documentId: doc.id, uploadUrl: url });
}));

router.post('/:id/confirm-upload', requireAuth, requireRole('seller'), asyncHandler(async (req: Request, res: Response) => {
  const id = uuidSchema.parse(req.params.id);
  const doc = await confirmUpload(id, req.user!.userId);
  await verificationQueue.add('verify', { documentId: id, fileKey: doc.file_key });
  await timeoutQueue.add('timeout', { documentId: id }, { delay: 24 * 60 * 60 * 1000 });
  res.json(doc);
}));

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const docs = await listDocuments(req.user!.userId, req.user!.role);
  res.json(docs);
}));

router.get('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = uuidSchema.parse(req.params.id);
  const doc = await getDocument(id, req.user!.userId, req.user!.role);
  res.json(doc);
}));

export { router as documentRoutes };
