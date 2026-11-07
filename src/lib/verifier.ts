/**
 * Publication = a named human reviewer accepting responsibility (round 2, A2).
 * Mirrored by the `verified_by_is_a_real_name` check in supabase/migrations/0002_round2.sql.
 */
const PLACEHOLDER = /\b(placeholder|tbd|todo|test|tester|testing|unknown|anonymous|anon|dummy|sample|example|xxx+|part\s*\d|coder\s*[a-c]|r[1-3])\b/i;

/** Returns an error message, or null when the name is acceptable. Role names ("Coder A", "R1") are not people. */
export function verifierNameProblem(name: string | null | undefined): string | null {
  const n = (name ?? '').trim();
  if (n.length < 2 || !/\p{L}.*\p{L}/u.test(n)) return 'Enter the full name of the person who verified this card.';
  if (PLACEHOLDER.test(n)) return `"${n}" looks like a placeholder. Publication needs the real reviewer's name.`;
  return null;
}
