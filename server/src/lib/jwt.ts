import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '365d' });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  if (typeof payload.sub !== 'string') throw new Error('invalid token payload');
  return payload.sub;
}
