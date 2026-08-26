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
    if (tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('[push] send failed:', err);
  }
}
