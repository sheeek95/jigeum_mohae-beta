import fs from 'node:fs';

import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { friendsRouter } from './routes/friends.js';
import { groupsRouter } from './routes/groups.js';
import { invitesRouter } from './routes/invites.js';
import { photosRouter, UPLOAD_DIR } from './routes/photos.js';
import { pokesRouter } from './routes/pokes.js';
import { pushRouter } from './routes/push.js';
import { settingsRouter } from './routes/settings.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const app = express();

// gzips JSON API responses; already-compressed photo files under /uploads
// are skipped automatically (compression checks content-type).
app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d', immutable: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Short, our-own-domain redirect for the beta install link shared in invite
// messages — the real target (an expo.dev build page) is long and cannot be
// shortened at the source, so this exists purely so the shared link itself
// is short. Set APK_DOWNLOAD_URL in the Render dashboard when a new build's
// download URL replaces this one; no code change or redeploy needed for that.
const APK_DOWNLOAD_URL =
  process.env.APK_DOWNLOAD_URL ??
  'https://expo.dev/accounts/sheeeks-team/projects/jigeummohae/builds/d9acee25-9468-483d-8617-1c4202748228';
app.get('/i/:code', (_req, res) => res.redirect(302, APK_DOWNLOAD_URL));

app.use('/auth', authRouter);
app.use('/invites', invitesRouter);
app.use('/friends', friendsRouter);
app.use('/groups', groupsRouter);
app.use('/pokes', pokesRouter);
app.use('/photos', photosRouter);
app.use('/settings', settingsRouter);
app.use('/push', pushRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: '입력값이 올바르지 않아요', details: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: '서버 오류가 발생했어요' });
});
