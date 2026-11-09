/** Server-only HTTP helpers shared by every /api route. Never import from client code. */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import type { ApiErrorCode } from '../lib/types.js';
import type { LlmUnavailableError, ProviderName } from './llm.js';

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

/** Constant-time check of `x-curator-secret`. false when CURATOR_SECRET is unset. */
export function isCurator(req: Request): boolean {
  const secret = process.env.CURATOR_SECRET;
  if (!secret) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(req.headers.get('x-curator-secret') ?? ''), digest(secret));
}

/** Curator gate for protected routes (§10): shared secret in `x-curator-secret`, checked server-side. */
export function requireCurator(req: Request): Response | null {
  if (!process.env.CURATOR_SECRET) return apiError(503, 'not_configured', 'CURATOR_SECRET is not set on the server');
  return isCurator(req) ? null : apiError(401, 'unauthorized', 'Invalid curator secret');
}

/**
 * Curator-only failover rehearsal switch: `x-ignis-provider: groq|gemini` + a valid `x-curator-secret`
 * forces that ONE provider for this request (no fallthrough). Without a valid secret the header is
 * ignored entirely, with no error and no mention, so the public sees exactly today's behavior. Forced
 * requests must never touch the briefing cache (see /api/synthesize).
 */
export function forcedProvider(req: Request): { provider: ProviderName | null; response?: never } | { response: Response } {
  const raw = req.headers.get('x-ignis-provider');
  if (!raw || !isCurator(req)) return { provider: null };
  const p = raw.trim().toLowerCase();
  if (p === 'groq' || p === 'gemini') return { provider: p };
  return { response: apiError(400, 'invalid_request', 'x-ignis-provider must be groq or gemini') };
}

/**
 * 502 for "every provider failed". Per-provider records (class/status/ms — never keys or prompts)
 * are added as `providers_tried` only for `x-ignis-debug: 1` WITH a valid curator secret.
 */
export function llmUnavailable(req: Request, e: LlmUnavailableError, message: string): Response {
  const debug = req.headers.get('x-ignis-debug') === '1' && isCurator(req);
  return json({ error: { code: 'llm_unavailable', message, ...(debug && { providers_tried: e.attempts }) } }, 502);
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
