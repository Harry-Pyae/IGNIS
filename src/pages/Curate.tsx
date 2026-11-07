/**
 * /curate — internal curation path (§8.2, round 2 A1/A2). Ugly-but-fast by design; not judged.
 *   R1 enters/extracts → SAVE DRAFT (private) → reopens, checks every value → VERIFY & PUBLISH under their own name.
 * Protection is SERVER-SIDE (curator secret checked in /api/*); hiding this route is not the protection.
 * OWNER: Coder A.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Panel, Select } from '../components/ui';
import {
  applyExtraction,
  CARRYABLE_FIELDS,
  EMPTY_FORM,
  FIELD_KINDS,
  type FormValues,
  recordToValues,
  valuesToRecord,
} from '../lib/curation';
import { cx } from '../lib/cx';
import {
  type CurateListItem,
  DomainSchema,
  type Experiment,
  type ExtractDraft,
  FuelFormSchema,
  MaterialClassSchema,
  OutcomeSchema,
} from '../lib/types';
import { verifierNameProblem } from '../lib/verifier';

const ENUMS: Record<string, readonly string[]> = {
  domain: DomainSchema.options,
  material_class: MaterialClassSchema.options,
  fuel_form: FuelFormSchema.options,
  outcome: OutcomeSchema.options,
};
const REQUIRED = new Set([
  'domain', 'campaign', 'test_id', 'fuel_material', 'material_class', 'fuel_form', 'outcome',
  'key_observation_quote', 'source_title', 'source_url',
]);
const PLACEHOLDERS: Record<string, string> = {
  telemetry: '{"label":…,"x_label":…,"y_label":…,"points":[[x,y],…]}',
  condition_changes: '[{"parameter":"flow_cm_s","from":10,"to":2.2,"stored":"final_held","note":"… (p.5)"}]',
};
const SECRET_KEY = 'ignis-curator-secret';

type Status = { tone: 'success' | 'warn'; text: string } | null;
type Dropped = { field: string; reason: string }[];

function readSecret() {
  try {
    return sessionStorage.getItem(SECRET_KEY) ?? '';
  } catch {
    return '';
  }
}

export function Curate() {
  const [secret, setSecret] = useState(readSecret);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [editing, setEditing] = useState<{ id: string; status: 'draft' | 'published' } | null>(null);
  const [verifiedBy, setVerifiedBy] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [carry, setCarry] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [dropped, setDropped] = useState<Dropped>([]);
  const [cards, setCards] = useState<CurateListItem[] | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const saveSecret = (s: string) => {
    setSecret(s);
    try {
      sessionStorage.setItem(SECRET_KEY, s);
    } catch {
      /* private mode: keep in memory only */
    }
  };

  const call = useCallback(
    async (path: string, body?: unknown) => {
      const res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', 'x-curator-secret': secret },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issues = json?.error?.issues?.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`);
        throw new Error([json?.error?.message ?? `HTTP ${res.status}`, ...(issues ?? [])].join('\n'));
      }
      return json;
    },
    [secret],
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
    } catch (e) {
      setStatus({ tone: 'warn', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const refresh = useCallback(async () => {
    const { items } = (await call('/api/curate-cards')) as { items: CurateListItem[] };
    setCards(items);
  }, [call]);

  useEffect(() => {
    if (secret.length < 4) return;
    let alive = true;
    call('/api/curate-cards')
      .then(({ items }) => alive && setCards(items as CurateListItem[]))
      .catch(() => alive && setCards(null));
    return () => {
      alive = false;
    };
  }, [secret, call]);

  const newCard = () => {
    setValues(EMPTY_FORM);
    setEditing(null);
    setQuotes({});
    setDropped([]);
    setVerifiedBy('');
    setStatus(null);
  };

  const reopen = (id: string) =>
    run(async () => {
      const { experiment } = (await call(`/api/curate-cards?id=${id}`)) as { experiment: Experiment };
      setValues(recordToValues(experiment));
      setEditing({ id, status: experiment.verified_by ? 'published' : 'draft' });
      setQuotes({});
      setDropped([]);
      setVerifiedBy('');
      setStatus({
        tone: 'success',
        text: experiment.verified_by
          ? `Reopened PUBLISHED card ${experiment.test_id} (verified by ${experiment.verified_by}). Saving a change un-publishes it until it is re-verified.`
          : `Reopened draft ${experiment.test_id}.`,
      });
    });

  const extract = () =>
    run(async () => {
      const { draft, dropped } = (await call('/api/extract', { text: excerpt })) as { draft: ExtractDraft; dropped: Dropped };
      // A1: a clean draft every time — only ticked carry-forward fields survive.
      setValues((v) => applyExtraction(v, draft, carry));
      setEditing(null);
      setQuotes(draft.field_quotes);
      setDropped(dropped);
      setStatus({ tone: 'success', text: 'New draft filled from the excerpt. Check EVERY field against the source before saving.' });
    });

  const save = (publish: boolean) =>
    run(async () => {
      const result = valuesToRecord(values);
      if ('errors' in result) throw new Error(result.errors.join('\n'));
      if (publish) {
        const problem = verifierNameProblem(verifiedBy);
        if (problem) throw new Error(problem);
      }
      const body = publish
        ? { action: 'publish', id: editing?.id, record: result.record, verified_by: verifiedBy.trim() }
        : { action: 'save_draft', id: editing?.id, record: result.record };
      const { experiment } = (await call('/api/curate-write', body)) as { experiment: Experiment };
      setEditing({ id: experiment.id, status: experiment.verified_by ? 'published' : 'draft' });
      setStatus({
        tone: 'success',
        text: publish
          ? `Published ${experiment.test_id}, verified by ${experiment.verified_by}. It is now visible to the public.`
          : `Saved draft ${experiment.test_id} (${experiment.id}). Drafts are private until a curator verifies them.`,
      });
      await refresh();
    });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save(false);
  };

  const input = 'w-full rounded-lg border border-border bg-bg/70 px-3 py-2 text-[15px] text-text sm:text-sm';

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="console-label text-amber">Internal · curators only</span>
          <h1 className="mt-1 text-2xl font-semibold">Curation</h1>
          <p className="mt-1 max-w-2xl text-sm text-dim">
            Only explicitly stated values. Ambiguous → null + note. Quote verbatim with original units. Changing conditions
            go in condition_changes, never stored as constant.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="console-label text-dim">Curator secret</span>
          <input type="password" autoComplete="off" value={secret} onChange={(e) => saveSecret(e.target.value)} className={`${input} w-64`} />
        </label>
      </div>

      {status && (
        <Panel tone={status.tone === 'success' ? 'observed' : 'untested'} className="!p-4" role="status">
          <pre className="font-mono text-[13px] whitespace-pre-wrap text-text">{status.text}</pre>
        </Panel>
      )}

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="console-label text-amber">Cards · drafts and published</h2>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy || !secret} onClick={() => run(refresh)}>
              Refresh
            </Button>
            <Button size="sm" variant="primary" onClick={newCard}>
              New card
            </Button>
          </div>
        </div>
        {cards === null ? (
          <p className="mt-3 text-sm text-dim">Enter the curator secret to list cards.</p>
        ) : cards.length === 0 ? (
          <p className="mt-3 text-sm text-dim">No cards yet.</p>
        ) : (
          <ul className="mt-3 flex max-h-64 flex-col divide-y divide-border overflow-auto rounded-lg border border-border">
            {cards.map((c) => (
              <li key={c.id} className={cx('flex flex-wrap items-center gap-3 px-3 py-2 text-sm', editing?.id === c.id && 'bg-amber/8')}>
                <Badge variant={c.status === 'published' ? 'success' : 'warn'}>{c.status}</Badge>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-text">{c.test_id}</span>
                  <span className="text-dim"> · {c.campaign} · {c.source_title}</span>
                </span>
                {c.verified_by && <span className="text-dim">by {c.verified_by}</span>}
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => reopen(c.id)}>
                  Reopen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Source excerpt stays visible beside the draft (§8.2). */}
        <Panel className="flex flex-col gap-3 lg:sticky lg:top-20">
          <h2 className="console-label text-amber">Source excerpt · LLM draft (optional)</h2>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={14}
            placeholder="Paste a paper excerpt or results table… It stays here while you check the draft."
            className={`${input} font-mono text-[13px]`}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="console-label mb-1 text-dim">Carry into the new draft (unticked = cleared)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {CARRYABLE_FIELDS.map((f) => (
                <label key={f} className="flex items-center gap-1.5 font-mono text-[12px] text-dim">
                  <input
                    type="checkbox"
                    checked={carry.includes(f)}
                    onChange={(e) => setCarry((c) => (e.target.checked ? [...c, f] : c.filter((x) => x !== f)))}
                  />
                  {f}
                </label>
              ))}
            </div>
          </fieldset>
          <Button icon="search" disabled={busy || excerpt.trim().length < 20} onClick={extract}>
            Extract into a new draft
          </Button>
          {dropped.length > 0 && (
            <div className="rounded-lg border border-untested-border bg-untested-bg p-3 text-[13px] text-text">
              <p className="console-label text-warn">Discarded by the server</p>
              <ul className="mt-1 list-disc pl-4">
                {dropped.map((d) => (
                  <li key={d.field}>
                    <span className="font-mono">{d.field}</span> —{' '}
                    {d.reason === 'missing_quote' ? 'no supporting quote' : 'quote not found in the excerpt'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <form onSubmit={onSubmit}>
          <Panel className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Badge variant={editing ? (editing.status === 'published' ? 'success' : 'warn') : 'neutral'}>
                {editing ? `Editing ${editing.status}` : 'New card'}
              </Badge>
              {editing && <code className="font-mono text-[11px] text-dim">{editing.id}</code>}
            </div>
            {Object.entries(FIELD_KINDS).map(([name, kind]) => {
              const label = `${name}${REQUIRED.has(name) ? ' *' : ''}`;
              const wide = kind === 'long' || kind === 'json';
              if (kind === 'enum')
                return (
                  <Select
                    key={name}
                    label={label}
                    value={values[name] ?? ''}
                    placeholder="—"
                    options={ENUMS[name]!.map((o) => ({ value: o, label: o }))}
                    onChange={(e) => set(name, e.target.value)}
                  />
                );
              return (
                <label key={name} className={cx('flex flex-col gap-1.5', wide && 'sm:col-span-2')}>
                  <span className="console-label text-dim">{label}</span>
                  {wide ? (
                    <textarea
                      rows={kind === 'json' ? 3 : 2}
                      value={values[name] ?? ''}
                      onChange={(e) => set(name, e.target.value)}
                      className={`${input} font-mono`}
                      placeholder={PLACEHOLDERS[name] ?? ''}
                    />
                  ) : (
                    <input
                      inputMode={kind === 'number' ? 'decimal' : kind === 'int' ? 'numeric' : undefined}
                      value={values[name] ?? ''}
                      onChange={(e) => set(name, e.target.value)}
                      className={input}
                    />
                  )}
                  {quotes[name] && <span className="font-mono text-[11px] text-warn">“{quotes[name]}”</span>}
                </label>
              );
            })}

            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                Save draft
              </Button>
              <span className="mx-1 hidden h-8 w-px bg-border sm:block" aria-hidden />
              <label className="flex flex-col gap-1">
                <span className="console-label text-dim">Verified by (your full name)</span>
                <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className={`${input} w-56`} />
              </label>
              <Button variant="primary" icon="verify" disabled={busy} onClick={() => save(true)}>
                Verify &amp; publish
              </Button>
            </div>
            <p className="text-[13px] text-dim sm:col-span-2">
              Publishing means you checked every non-null field against the source yourself. Never publish under
              someone else&apos;s name — save a draft and hand it over instead.
            </p>
          </Panel>
        </form>
      </div>
    </main>
  );
}
