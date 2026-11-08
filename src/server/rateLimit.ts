/**
 * Per-IP fixed-window rate limit for the public routes (§10), shared across every Vercel
 * instance via Postgres (supabase/migrations/0003_rate_limit.sql). Server-only.
 *
 * FAILS OPEN: if the counter can't be reached (no service key, DB error, slow DB, odd reply),
 * the request is served. A judge demo must never die on the rate limiter.
 */
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from './db.js';
import { apiError, clientIp } from './http.js';

/** Upper bound the limiter may add to a request before it gives up and lets it through. */
const TIMEOUT_MS = 800;

export async function rateLimit(
  req: Request,
  bucket: string,
  limit = 20,
  windowMs = 60_000,
  db: SupabaseClient | null = serviceClient(),
): Promise<Response | null> {
  if (!db) return null;
  // Hashed: the table never holds a raw IP address.
  const key = createHash('sha256').update(`${bucket}:${clientIp(req)}`).digest('hex');
  try {
    const { data, error } = await db
      .rpc('rate_limit_hit', { p_key: key, p_limit: limit, p_window_s: Math.ceil(windowMs / 1000) })
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    const hit = data as { allowed?: unknown; retry_after_s?: unknown } | null;
    if (error || typeof hit?.allowed !== 'boolean') {
      console.error(JSON.stringify({ event: 'rate_limit_fail_open', bucket, reason: error ? 'db_error' : 'bad_reply' }));
      return null;
    }
    if (hit.allowed) return null;
    const res = apiError(429, 'rate_limited', 'Too many requests — try again in a minute');
    res.headers.set('retry-after', String(Number(hit.retry_after_s) || 60));
    return res;
  } catch {
    console.error(JSON.stringify({ event: 'rate_limit_fail_open', bucket, reason: 'timeout_or_network' }));
    return null;
  }
}
