import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signToken } from '../utils/jwt-utils';
import { requireAuth } from '../middleware/auth-middleware';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import prisma from '../services/prisma-client';

const router = Router();

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(401, 'Invalid credentials');
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError(401, 'Invalid credentials');
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
}));

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) throw new AppError(404, 'User not found');
  res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
}));

export { router as authRoutes };
