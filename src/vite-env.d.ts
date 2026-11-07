/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public values only — injected via `define` in vite.config.ts. */
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
}
