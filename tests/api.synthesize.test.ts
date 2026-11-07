/** /api/synthesize trust boundary (A4): ineligible evidence is rejected BEFORE any provider call. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { card, scenario, t4 } from './helpers';

const h = vi.hoisted(() => ({ rows: [] as unknown[], completeJson: vi.fn() }));

vi.mock('../src/server/llm.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/server/llm')>()),
  completeJson: h.completeJson,
}));
vi.mock('../src/server/db.js', () => ({
  serviceClient: () => null,
  anonClient: () => ({
    from: () => ({ select: async () => ({ data: h.rows, error: null }) }),
    rpc: async () => ({
      data: { verified: h.rows.length, in_review: 0, campaigns: ['BASS'], last_updated: null, revision: 'rev-x' },
      error: null,
    }),
  }),
}));

const { POST } = await import('../api/synthesize');

let ip = 0;
const call = (body: unknown) =>
  POST(
    new Request('http://x/api/synthesize', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${++ip}` },
      body: JSON.stringify(body),
    }),
  );

const e1 = card();
const e2 = t4();
const same = card({ domain: 'smoke_detection', campaign: 'SAME', test_id: 'SAME run 3' });

beforeEach(() => {
  h.rows = [e1, e2, same];
  h.completeJson.mockReset();
});

describe('POST /api/synthesize', () => {
  it('rejects a verified SAME card in a solid scenario before any provider call', async () => {
    const res = await call({ scenario: scenario(), experiment_ids: [e1.id, same.id] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: 'ineligible_evidence', issues: [{ path: same.id, message: 'domain_mismatch' }] });
    expect(h.completeJson).not.toHaveBeenCalled();
  });

  it('rejects duplicate ids', async () => {
    const res = await call({ scenario: scenario(), experiment_ids: [e1.id, e1.id] });
    expect(res.status).toBe(400);
    expect(h.completeJson).not.toHaveBeenCalled();
  });

  it('rejects unknown / unverified ids', async () => {
    const res = await call({ scenario: scenario(), experiment_ids: [crypto.randomUUID()] });
    expect((await res.json()).error.code).toBe('ineligible_evidence');
    expect(h.completeJson).not.toHaveBeenCalled();
  });

  it('rejects a non-solid public scenario', async () => {
    const res = await call({ scenario: { ...scenario(), domain: 'smoke_detection' }, experiment_ids: [same.id] });
    expect((await res.json()).error.code).toBe('invalid_request');
    expect(h.completeJson).not.toHaveBeenCalled();
  });

  it('rejects an unresolved material', async () => {
    const s = scenario({ material: { status: 'unresolved', raw: 'cabin wall', reason: 'ambiguous', candidates: [] } });
    const res = await call({ scenario: s, experiment_ids: [e1.id] });
    expect((await res.json()).error.message).toMatch(/unresolved/);
    expect(h.completeJson).not.toHaveBeenCalled();
  });

  it('eligible evidence → validated briefing with deterministic coverage', async () => {
    h.completeJson.mockResolvedValue({
      provider: 'groq',
      data: {
        claims: [
          {
            classification: 'OBSERVED',
            text: 'GMT96-T7 sustained at 21% O2.',
            evidence_ids: ['E1'],
            refs: [
              { evidence_id: 'E1', field: 'outcome', value: 'sustained', unit: null },
              { evidence_id: 'E1', field: 'o2_pct', value: 21, unit: '%' },
            ],
            gap_ids: [],
          },
        ],
      },
    });
    const res = await call({ scenario: scenario({ pressure_kpa: 300 }), experiment_ids: [e1.id, e2.id] });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', withheld_count: 0, catalog_revision: 'rev-x' });
    expect(body.coverage.gaps.map((g: { kind: string }) => g.kind)).toEqual(['outside_catalog_range']);
    expect(body.coverage.eligible_catalog_count).toBe(2); // SAME excluded from the catalog population too
    expect(h.completeJson).toHaveBeenCalledTimes(1);
  });
});
