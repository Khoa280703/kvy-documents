import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

export function requireRole(...roles: ('seller' | 'admin')[]) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (!_req.user || !roles.includes(_req.user.role)) return void next(new AppError(403, 'Forbidden'));
    next();
  };
}
