import type { NextFunction, Request, Response } from 'express';

import { verifyToken } from '../lib/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: '로그인이 필요해요' });
    return;
  }
  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰이에요' });
  }
}
