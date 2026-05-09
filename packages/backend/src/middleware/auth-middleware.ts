import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt-utils';
import { AppError } from '../utils/app-error';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(_req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = _req.cookies.token;
    if (!token) throw new AppError(401, 'Unauthorized');
    _req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError(401, 'Unauthorized'));
  }
}
