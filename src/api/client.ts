import { getApiUrl } from './urlConfig';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const HANGUL_RE = /[가-힣]/;

// Screens show `err.message` straight to the user on failure — fine for an
// ApiError (the server's own Korean message, e.g. "그룹 정원이 가득 찼어요")
// or our own client-authored ones (e.g. the request-timeout message below),
// but a raw library/runtime error (a TypeError, a third-party package's
// English Error.message like React Native's "Unsupported FormDataPart
// implementation") would otherwise leak straight to the user as unreadable
// English. Every message we author ourselves is Korean, so "does it contain
// Hangul" cleanly tells the two apart without having to special-case every
// error type individually.
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && HANGUL_RE.test(err.message)) return err.message;
  return fallback;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  json?: unknown;
  form?: FormData;
}

// plain fetch() has no default timeout — on a bad connection or a stuck
// server it can hang indefinitely instead of failing, leaving screens
// spinning forever with nothing for the user to do. 20s comfortably covers
// a Render free-tier cold start while still failing fast on a real hang.
const REQUEST_TIMEOUT_MS = 20_000;

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) headers.authorization = `Bearer ${authToken}`;

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('서버 응답이 너무 오래 걸려요. 잠시 후 다시 시도해주세요.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `요청에 실패했어요 (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: 'POST', json }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: 'PATCH', json }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function resolveMediaUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${getApiUrl()}${pathOrUrl}`;
}
