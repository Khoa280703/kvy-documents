import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'seller' | 'admin';
}

const signOptions: SignOptions = { expiresIn: 604800 }; // 7 days in seconds

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, signOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}
