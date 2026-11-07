/**
 * Server-side extraction hygiene (round 2, A1). Every populated numeric draft field must
 * carry a quote, and every quote must actually occur in the pasted excerpt — otherwise the
 * value is nulled and reported. This checks source PRESENCE, not scientific correctness:
 * Part 4 still verifies units and interpretation.
 */
import { EXTRACT_NUMERIC_FIELDS, type ExtractDraft } from './types.js';

/** Whitespace/line-wrap/quote-style insensitive comparison form. */
const norm = (s: string) =>
  s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/-\s*\n\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export interface DroppedField {
  field: string;
  reason: 'missing_quote' | 'quote_not_in_excerpt';
}

export function sanitizeDraft(draft: ExtractDraft, excerpt: string): { draft: ExtractDraft; dropped: DroppedField[] } {
  const source = norm(excerpt);
  const inSource = (q: string) => source.includes(norm(q));
  const out: ExtractDraft = { ...draft, field_quotes: {} };
  const dropped: DroppedField[] = [];

  for (const [field, quote] of Object.entries(draft.field_quotes)) if (inSource(quote)) out.field_quotes[field] = quote;

  for (const f of EXTRACT_NUMERIC_FIELDS) {
    if (out[f] == null) continue;
    const quote = draft.field_quotes[f];
    if (!quote) dropped.push({ field: f, reason: 'missing_quote' });
    else if (!inSource(quote)) dropped.push({ field: f, reason: 'quote_not_in_excerpt' });
    else continue;
    out[f] = null;
  }
  if (out.key_observation_quote && !inSource(out.key_observation_quote)) {
    dropped.push({ field: 'key_observation_quote', reason: 'quote_not_in_excerpt' });
    out.key_observation_quote = null;
  }
  return { draft: out, dropped };
}
