/** Server-only HTTP helpers shared by every /api route. Never import from client code. */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import type { ApiErrorCode } from '../lib/types.js';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  issues?: { path: string; message: string }[],
): Response {
  return json({ error: { code, message, ...(issues && { issues }) } }, status);
}

/** Parse + Zod-validate a JSON body. Returns the data or a ready 400 response. */
export async function readJson<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T; response?: never } | { data?: never; response: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { response: apiError(400, 'invalid_request', 'Body must be valid JSON') };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return { response: apiError(400, 'invalid_request', 'Request failed validation', issues) };
  }
  return { data: parsed.data };
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

// ponytail: in-memory per serverless instance (resets on cold start); move to Vercel KV/Upstash if abused.
const hits = new Map<string, { count: number; resetAt: number }>();

/** Per-IP fixed-window limiter for the public routes (§10). Returns a 429 response or null. */
export function rateLimit(req: Request, bucket: string, limit = 20, windowMs = 60_000, now = Date.now()): Response | null {
  if (hits.size > 10_000) hits.clear();
  const key = `${bucket}:${clientIp(req)}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (++entry.count <= limit) return null;
  const res = apiError(429, 'rate_limited', 'Too many requests — try again in a minute');
  res.headers.set('retry-after', String(Math.ceil((entry.resetAt - now) / 1000)));
  return res;
}

/** Curator gate for protected routes (§10): shared secret in `x-curator-secret`, checked server-side. */
export function requireCurator(req: Request): Response | null {
  const secret = process.env.CURATOR_SECRET;
  if (!secret) return apiError(503, 'not_configured', 'CURATOR_SECRET is not set on the server');
  const digest = (s: string) => createHash('sha256').update(s).digest();
  const ok = timingSafeEqual(digest(req.headers.get('x-curator-secret') ?? ''), digest(secret));
  return ok ? null : apiError(401, 'unauthorized', 'Invalid curator secret');
}

/** Wrap a handler so unexpected errors become a controlled 500 (message only — never secrets). */
export function route(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (e) {
      console.error('[api] unhandled:', e instanceof Error ? e.message : 'unknown error');
      return apiError(500, 'internal', 'Unexpected server error');
    }
  };
}
