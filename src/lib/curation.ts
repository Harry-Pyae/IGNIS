/**
 * /curate form state helpers (pure, testable). OWNER: Part 1.
 * Round 2, A1: every extraction starts from a CLEAN form. Only fields the curator explicitly
 * ticks in "carry forward" survive; every extractable field is replaced (null → blank).
 */
import {
  CurateRecordSchema,
  type CurateRecord,
  EXTRACT_FIELDS,
  type Experiment,
  type ExtractDraft,
} from './types.js';

export type FormValues = Record<string, string>;

/** Curator-owned fields that may be carried into the next extraction, only when explicitly chosen. */
export const CARRYABLE_FIELDS = ['source_url', 'psi_investigation', 'domain', 'source_title', 'ntrs_id'] as const;

export const EMPTY_FORM: FormValues = { domain: 'solid_flammability' };

type Kind = 'text' | 'long' | 'number' | 'int' | 'json';
export const FIELD_KINDS: Record<keyof CurateRecord, Kind | 'enum'> = {
  domain: 'enum',
  campaign: 'text',
  test_id: 'text',
  fuel_material: 'text',
  material_class: 'enum',
  fuel_form: 'enum',
  thickness_mm: 'number',
  o2_pct: 'number',
  flow_cm_s: 'number',
  pressure_kpa: 'number',
  ignition_method: 'text',
  outcome: 'enum',
  spread_rate_mm_s: 'number',
  key_observation_quote: 'long',
  observation_summary: 'long',
  source_title: 'text',
  source_url: 'text',
  psi_investigation: 'text',
  source_page: 'int',
  source_figure: 'text',
  source_table: 'text',
  source_section: 'text',
  ntrs_id: 'text',
  doi: 'text',
  media_url: 'text',
  telemetry: 'json',
  condition_changes: 'json',
  notes: 'long',
};

export function applyExtraction(current: FormValues, draft: ExtractDraft, carry: readonly string[]): FormValues {
  const next: FormValues = { ...EMPTY_FORM };
  for (const k of carry) if (current[k]) next[k] = current[k];
  for (const f of EXTRACT_FIELDS) {
    const v = draft[f];
    next[f] = v == null ? '' : String(v);
  }
  return next;
}

/** Reopen a saved card into the form. */
export function recordToValues(e: Experiment): FormValues {
  const out: FormValues = {};
  for (const [k, kind] of Object.entries(FIELD_KINDS)) {
    const v = e[k as keyof Experiment];
    out[k] = v == null ? '' : kind === 'json' ? JSON.stringify(v, null, 2) : String(v);
  }
  return out;
}

/** Form → validated record (blank → null). Returns Zod issues as readable lines on failure. */
export function valuesToRecord(v: FormValues): { record: CurateRecord } | { errors: string[] } {
  const raw: Record<string, unknown> = {};
  for (const [k, kind] of Object.entries(FIELD_KINDS)) {
    const s = (v[k] ?? '').trim();
    if (s === '') raw[k] = null;
    else if (kind === 'number' || kind === 'int') raw[k] = Number(s);
    else if (kind === 'json') {
      try {
        raw[k] = JSON.parse(s);
      } catch {
        return { errors: [`${k}: not valid JSON`] };
      }
    } else raw[k] = s;
  }
  const parsed = CurateRecordSchema.safeParse(raw);
  return parsed.success
    ? { record: parsed.data }
    : { errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}
