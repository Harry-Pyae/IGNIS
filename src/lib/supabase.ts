/**
 * Browser Supabase client — ANON key only. RLS (§10) means it can read verified
 * experiments and nothing else. All writes go through /api/curate-write.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL;
const anonKey = import.meta.env.SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
