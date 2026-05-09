import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth-middleware';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import prisma from '../services/prisma-client';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const isRead = req.query.is_read === 'false' ? false : undefined;
  const where: any = { user_id: req.user!.userId };
  if (isRead !== undefined) where.is_read = isRead;
  const notifications = await prisma.notification.findMany({ where,
    orderBy: { created_at: 'desc' },
  });
  res.json(notifications);
}));

router.patch('/:id/read', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.user_id !== req.user!.userId) throw new AppError(404, 'Not found');
  const updated = await prisma.notification.update({ where: { id }, data: { is_read: true } });
  res.json(updated);
}));

export { router as notificationRoutes };
