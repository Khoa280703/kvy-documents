import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth-middleware';
import { requireRole } from '../middleware/role-guard';
import { transitionState, postTransitionEffects } from '../services/verification-service';
import { getDocument } from '../services/document-service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import prisma from '../services/prisma-client';

const router = Router();

router.get('/pending-reviews', requireAuth, requireRole('admin'), asyncHandler(async (_req: Request, res: Response) => {
  const docs = await prisma.document.findMany({
    where: { status: 'pending_review' },
    orderBy: { submitted_at: 'asc' },
    include: { seller: { select: { name: true, email: true } } },
  });
  res.json(docs);
}));

router.get('/audit-logs', requireAuth, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const logs = await prisma.auditLog.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { created_at: 'desc' },
    include: { document: { select: { file_name: true, seller: { select: { name: true } } } } },
  });
  res.json(logs);
}));

router.post('/documents/:id/review', requireAuth, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { action, reason, version } = z.object({ action: z.enum(['approve', 'reject']), reason: z.string(), version: z.number() }).parse(req.body);
  const status = action === 'approve' ? 'approved' : 'rejected';
  const { updated } = await transitionState(id, status, { actorId: req.user!.userId, actorType: 'admin', reason, expectedVersion: version });
  await postTransitionEffects(updated, 'pending_review', status, req.user!.userId);
  res.json(updated);
}));

router.get('/documents/:id/audit-logs', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = z.string().uuid().parse(req.params.id);
  const doc = await getDocument(id, req.user!.userId, req.user!.role);
  const logs = await prisma.auditLog.findMany({ where: { document_id: id }, orderBy: { created_at: 'asc' } });
  res.json(logs);
}));

export { router as adminRoutes };
