import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { transitionState } from '../services/verification-service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

const webhookSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(['verified', 'rejected', 'inconclusive']),
  reason: z.string().optional(),
});

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-webhook-secret';

router.post('/verification', asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers['x-webhook-secret'] as string;
  if (authHeader !== WEBHOOK_SECRET) throw new AppError(401, 'Unauthorized webhook');

  try {
    const { documentId, status, reason } = webhookSchema.parse(req.body);
    const doc = await transitionState(documentId, status, { actorType: 'system', reason });
    res.json({ status: 'processed', document: doc });
  } catch (err) {
    console.error('Webhook error:', err);
    throw new AppError(400, 'Invalid webhook payload');
  }
}));

export { router as webhookRoutes };
