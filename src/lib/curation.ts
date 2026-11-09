/**
 * /curate form state helpers (pure, testable). OWNER: Coder A.
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

/** The card the form is currently bound to (null = a new, unsaved card). */
export type Editing = { id: string; status: 'draft' | 'published' } | null;

/** /api/curate-write body. The ONLY place a card id enters a write: from the form's current binding. */
export function writeBody(record: CurateRecord, editing: Editing, publish: boolean, verifiedBy: string) {
  return publish
    ? { action: 'publish' as const, id: editing?.id, record, verified_by: verifiedBy.trim() }
    : { action: 'save_draft' as const, id: editing?.id, record };
}

/**
 * Round 3, item 4 (review §2C): a pending save / reopen / extract must never attach its response
 * to a form the curator has switched away from. Every switch (New card, Reopen, Extract) starts a
 * new session; an operation captures its session when it starts and applies its result only if
 * that session is still the current one. (The UI also disables switching while busy.)
 */
export function createFormSessions() {
  let current = 0;
  return {
    /** The form now describes something else: everything still in flight is superseded. */
    switchForm: () => void ++current,
    /** Capture the session at the start of an operation; call the result before applying a response. */
    begin: () => {
      const mine = current;
      return () => mine === current;
    },
  };
}
