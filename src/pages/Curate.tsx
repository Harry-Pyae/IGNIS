/**
 * /curate — internal curation path (§8.2). Ugly-but-fast by design; not judged.
 * Protection is SERVER-SIDE (curator secret checked in /api/*); hiding this route is not the protection.
 */
import { useState, type FormEvent } from 'react';
import { Badge, Button, Panel, Select } from '../components/ui';
import {
  ExperimentInsertSchema,
  FuelFormSchema,
  MaterialClassSchema,
  OutcomeSchema,
  DomainSchema,
  type ExtractDraft,
} from '../lib/types';

type FieldKind = 'text' | 'long' | 'number' | 'int' | 'json' | { enum: readonly string[] };
const FIELDS: [name: string, kind: FieldKind, required?: boolean][] = [
  ['domain', { enum: DomainSchema.options }, true],
  ['campaign', 'text', true],
  ['test_id', 'text', true],
  ['fuel_material', 'text', true],
  ['material_class', { enum: MaterialClassSchema.options }, true],
  ['fuel_form', { enum: FuelFormSchema.options }, true],
  ['thickness_mm', 'number'],
  ['o2_pct', 'number'],
  ['flow_cm_s', 'number'],
  ['pressure_kpa', 'number'],
  ['ignition_method', 'text'],
  ['outcome', { enum: OutcomeSchema.options }, true],
  ['spread_rate_mm_s', 'number'],
  ['key_observation_quote', 'long', true],
  ['observation_summary', 'long'],
  ['source_title', 'text', true],
  ['source_url', 'text', true],
  ['psi_investigation', 'text'],
  ['source_page', 'int'],
  ['source_figure', 'text'],
  ['source_table', 'text'],
  ['source_section', 'text'],
  ['ntrs_id', 'text'],
  ['doi', 'text'],
  ['media_url', 'text'],
  ['telemetry', 'json'],
  ['notes', 'long'],
];

type Values = Record<string, string>;
const EMPTY: Values = { domain: 'solid_flammability' };
const SECRET_KEY = 'ignis-curator-secret';

function toPayload(v: Values, verifiedBy: string | null) {
  const out: Record<string, unknown> = { verified_by: verifiedBy };
  for (const [name, kind] of FIELDS) {
    const raw = (v[name] ?? '').trim();
    if (raw === '') out[name] = null;
    else if (kind === 'number' || kind === 'int') out[name] = Number(raw);
    else if (kind === 'json') {
      try {
        out[name] = JSON.parse(raw);
      } catch {
        out[name] = raw; // let Zod report it
      }
    } else out[name] = raw;
  }
  return out;
}

function readSecret() {
  try {
    return sessionStorage.getItem(SECRET_KEY) ?? '';
  } catch {
    return '';
  }
}

export function Curate() {
  const [secret, setSecret] = useState(readSecret);
  const [values, setValues] = useState<Values>(EMPTY);
  const [verifiedBy, setVerifiedBy] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'warn'; text: string } | null>(null);
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

  async function call(path: string, body: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-curator-secret': secret },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const issues = json?.error?.issues?.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`);
      throw new Error([json?.error?.message ?? `HTTP ${res.status}`, ...(issues ?? [])].join('\n'));
    }
    return json;
  }

  async function extract() {
    setBusy(true);
    setStatus(null);
    try {
      const { draft } = (await call('/api/extract', {
        text: excerpt,
        ...(values.source_url && { source_url: values.source_url }),
      })) as { draft: ExtractDraft };
      const { field_quotes, ...fields } = draft;
      setValues((v) => {
        const next = { ...v };
        for (const [k, val] of Object.entries(fields))
          if (val !== undefined) next[k] = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return next;
      });
      setQuotes(field_quotes ?? {});
      setStatus({ tone: 'success', text: 'Draft filled. Check EVERY field against the source before publishing.' });
    } catch (e) {
      setStatus({ tone: 'warn', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = toPayload(values, verifiedBy.trim() || null);
    if (!payload.verified_by) return setStatus({ tone: 'warn', text: 'Enter your curator name to verify & publish.' });
    const parsed = ExperimentInsertSchema.safeParse(payload);
    if (!parsed.success)
      return setStatus({
        tone: 'warn',
        text: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
      });
    setBusy(true);
    try {
      const { experiment } = await call('/api/curate-write', parsed.data);
      setStatus({
        tone: 'success',
        text: `Published (verified): ${experiment.test_id} · ${experiment.id}`,
      });
      setValues(EMPTY);
      setQuotes({});
    } catch (err) {
      setStatus({ tone: 'warn', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded-lg border border-border bg-bg/70 px-3 py-2 text-[15px] text-text sm:text-sm';

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="console-label text-amber">Internal</span>
          <h1 className="mt-1 text-2xl font-semibold">Curation</h1>
          <p className="mt-1 text-sm text-dim">
            Only explicitly stated values. Ambiguous → null + note. Quote verbatim with original units.
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="console-label text-dim">Curator secret</span>
          <input type="password" autoComplete="off" value={secret} onChange={(e) => saveSecret(e.target.value)} className={`${input} w-64`} />
        </label>
      </div>

      {status && (
        <Panel tone={status.tone === 'success' ? 'observed' : 'untested'} className="!p-4">
          <pre className="font-mono text-[13px] whitespace-pre-wrap text-text">{status.text}</pre>
        </Panel>
      )}

      <Panel>
        <h2 className="console-label mb-3 text-amber">LLM extract → draft (optional)</h2>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={6}
          placeholder="Paste a paper excerpt or results table…"
          className={input}
        />
        <Button className="mt-3" icon="search" disabled={busy || excerpt.trim().length < 20} onClick={extract}>
          Extract draft
        </Button>
      </Panel>

      <form onSubmit={submit}>
        <Panel className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([name, kind, required]) => {
            const label = `${name}${required ? ' *' : ''}`;
            const wide = kind === 'long' || kind === 'json';
            if (typeof kind === 'object')
              return (
                <Select
                  key={name}
                  label={label}
                  value={values[name] ?? ''}
                  placeholder="—"
                  options={kind.enum.map((o) => ({ value: o, label: o }))}
                  onChange={(e) => set(name, e.target.value)}
                />
              );
            return (
              <label key={name} className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
                <span className="console-label text-dim">{label}</span>
                {wide ? (
                  <textarea rows={kind === 'json' ? 3 : 2} value={values[name] ?? ''} onChange={(e) => set(name, e.target.value)} className={`${input} font-mono`} placeholder={kind === 'json' ? '{"label":…,"x_label":…,"y_label":…,"points":[[x,y],…]}' : ''} />
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
            <label className="flex flex-col gap-1">
              <span className="console-label text-dim">verified_by (your name)</span>
              <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className={`${input} w-56`} />
            </label>
            <Button type="submit" variant="primary" icon="verify" disabled={busy}>
              Verify &amp; publish
            </Button>
            <Badge variant="neutral" className="ml-auto">
              Unverified rows are invisible to the public (RLS)
            </Badge>
          </div>
        </Panel>
      </form>
    </main>
  );
}
