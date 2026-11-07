import { createClient } from '@supabase/supabase-js';

/**
 * DB tests WRITE and delete rows. They run only with explicit consent: IGNIS_DB_TESTS=1, which
 * scripts/local-db.mjs writes into .env.disposable (a throwaway database). Never set it in a
 * normal .env — `npm test` must not touch whatever project a developer's .env points at.
 */
const {
  SUPABASE_URL: url,
  SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  IGNIS_DB_TESTS,
  IGNIS_DB_TESTS_REMOTE,
} = process.env;
// Local databases only — unless the remote project ref is named explicitly for this one run,
// e.g. `IGNIS_DB_TESTS_REMOTE=abcd1234 npx vitest run tests/db`. A stray flag in .env can't hit prod.
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(url ?? '');
const remoteNamed = Boolean(IGNIS_DB_TESTS_REMOTE && url?.includes(`//${IGNIS_DB_TESTS_REMOTE}.`));
export const dbTestsEnabled = IGNIS_DB_TESTS === '1' && Boolean(url && anonKey && serviceKey) && (isLocal || remoteNamed);

const opts = { auth: { persistSession: false } };
export const anon = () => createClient(url!, anonKey!, opts);
export const service = () => createClient(url!, serviceKey!, opts);

export const record = (test_id: string) => ({
  domain: 'solid_flammability' as const,
  campaign: 'BASS',
  test_id,
  fuel_material: 'PMMA',
  material_class: 'thermoplastic' as const,
  fuel_form: 'flat_sheet' as const,
  thickness_mm: 1,
  o2_pct: 21,
  flow_cm_s: 10,
  pressure_kpa: 101.325,
  ignition_method: null,
  outcome: 'sustained' as const,
  spread_rate_mm_s: null,
  key_observation_quote: 'DB test row — not real evidence.',
  observation_summary: null,
  source_title: 'IGNIS DB test',
  source_url: 'https://example.org/ignis-db-test',
  psi_investigation: null,
  source_page: null,
  source_figure: null,
  source_table: null,
  source_section: null,
  ntrs_id: null,
  doi: null,
  media_url: null,
  telemetry: null,
  condition_changes: null,
  notes: null,
});
