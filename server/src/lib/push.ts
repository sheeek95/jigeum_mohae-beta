import { prisma } from './prisma.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Best-effort: a failed push (bad token, Expo API hiccup, no token
// registered) should never break the request that triggered it, so this
// never throws — callers fire-and-forget it.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const tokens = await prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) {
      console.log(`[push] skipped — no token registered for user ${userId}`);
      return;
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      // Lets this same alert push also wake the client's background
      // notification task (see src/widgets/backgroundNotificationTask.ts)
      // on iOS to refresh the home-screen widget — without it, iOS only
      // invokes background handlers for a silent (no alert) push. Ignored
      // on Android, where the background task already fires on any push.
      _contentAvailable: true,
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    // The outer HTTP call succeeding says nothing about delivery — Expo
    // returns 200 with a per-message {status: 'error', message, details}
    // (e.g. DeviceNotRegistered for an uninstalled/stale token) inside the
    // body, which the previous version never read, so a silently-failing
    // push looked identical to a successful one in our own logs.
    const result: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`[push] Expo API responded ${res.status}:`, result);
      return;
    }
    const tickets = (result as { data?: Array<Record<string, unknown>> } | null)?.data ?? [];
    const failed = tickets.filter((t) => t.status === 'error');
    if (failed.length > 0) {
      console.error(`[push] ${failed.length}/${tickets.length} message(s) failed:`, failed);
    }
  } catch (err) {
    console.error('[push] send failed:', err);
  }
}
