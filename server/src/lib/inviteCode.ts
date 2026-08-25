import crypto from 'node:crypto';

export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url');
}
