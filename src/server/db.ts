/** Server-side Supabase clients. The service-role client must never be imported by client code. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

/** Writes (curate-write). Bypasses RLS — server routes only. */
export function serviceClient(): SupabaseClient | null {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  return SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opts) : null;
}

/** Reads as the public would — RLS guarantees verified rows only. */
export function anonClient(): SupabaseClient | null {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  return SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts) : null;
}
