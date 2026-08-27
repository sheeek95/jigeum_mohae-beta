import fs from 'node:fs';
import path from 'node:path';

import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { friendsRouter } from './routes/friends.js';
import { groupsRouter } from './routes/groups.js';
import { invitesRouter } from './routes/invites.js';
import { notificationsRouter } from './routes/notifications.js';
import { photosRouter, UPLOAD_DIR } from './routes/photos.js';
import { pokesRouter } from './routes/pokes.js';
import { pushRouter } from './routes/push.js';
import { settingsRouter } from './routes/settings.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const app = express();

// Render terminates TLS and proxies over plain HTTP internally — without
// this, req.protocol always reports "http" (via the X-Forwarded-Proto
// header only being trusted here), which would make the /i/:code og:image
// URL below http:// in production and risk link-preview crawlers rejecting it.
app.set('trust proxy', 1);

// gzips JSON API responses; already-compressed photo files under /uploads
// are skipped automatically (compression checks content-type).
app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d', immutable: true }));
app.use('/public', express.static(path.resolve(process.cwd(), 'public'), { maxAge: '7d' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// Short, our-own-domain link for the beta install link shared in invite
// messages — the real target (an expo.dev build page) is long, cannot be
// shortened at the source, and carries Expo's own branding in link previews
// (KakaoTalk, iMessage, etc.) rather than ours. Serving our own HTML with
// og:image/og:title here fixes the preview thumbnail; a meta-refresh sends
// an actual click straight on to the real download page (preview crawlers
// read the <meta> tags directly and don't follow it, so this doesn't affect
// what they show). Set APK_DOWNLOAD_URL in the Render dashboard when a new
// build's download URL replaces this one; no code change or redeploy
// needed for that.
const APK_DOWNLOAD_URL =
  process.env.APK_DOWNLOAD_URL ??
  'https://expo.dev/accounts/sheeeks-team/projects/jigeummohae/builds/01938dcc-2a4d-4e28-8034-a431161abd68';
app.get('/i/:code', (req, res) => {
  const ogImageUrl = `${req.protocol}://${req.get('host')}/public/og-icon.png`;
  res.type('html').send(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>지금 모해 설치하기</title>
<meta property="og:title" content="지금 모해 설치하기">
<meta property="og:description" content="친구가 보낸 사진이 위젯에 바로 뜨는 앱, 지금 모해를 설치해보세요">
<meta property="og:image" content="${ogImageUrl}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${APK_DOWNLOAD_URL}">
</head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;background:#120C24;color:#F7F3FF;">
<a href="${APK_DOWNLOAD_URL}" style="color:#FFD666;">앱 다운로드가 시작되지 않으면 여기를 눌러주세요</a>
</body>
</html>`);
});

app.use('/auth', authRouter);
app.use('/invites', invitesRouter);
app.use('/friends', friendsRouter);
app.use('/groups', groupsRouter);
app.use('/pokes', pokesRouter);
app.use('/photos', photosRouter);
app.use('/settings', settingsRouter);
app.use('/push', pushRouter);
app.use('/notifications', notificationsRouter);

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
