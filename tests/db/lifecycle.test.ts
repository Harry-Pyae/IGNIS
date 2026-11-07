/**
 * A2 lifecycle through the REAL API handlers + a disposable database:
 * draft (invisible to anon) → R1-style edit → placeholder publish rejected → publish (visible)
 * → correction un-publishes (invisible again, catalog revision changes).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { GET as curateCards } from '../../api/curate-cards';
import { POST as curateWrite } from '../../api/curate-write';
import { POST as synthesize } from '../../api/synthesize';
import { anon, dbTestsEnabled, record, service } from './env';

const secret = { 'x-curator-secret': process.env.CURATOR_SECRET ?? '' };
const write = (body: unknown, headers: Record<string, string> = secret) =>
  curateWrite(
    new Request('http://x/api/curate-write', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
const list = (query = '') => curateCards(new Request(`http://x/api/curate-cards${query}`, { headers: secret }));
const stats = async () => (await anon().rpc('catalog_stats')).data as { verified: number; in_review: number; revision: string };
const publicRows = async (test_id: string) => (await anon().from('experiments').select('id, verified_by').eq('test_id', test_id)).data;

describe.skipIf(!dbTestsEnabled)('curation lifecycle (A2)', () => {
  const testId = `LIFECYCLE-${crypto.randomUUID()}`;
  let id = '';
  afterAll(async () => {
    await service().from('experiments').delete().like('test_id', 'LIFECYCLE-%');
    await service().from('experiments').delete().like('test_id', 'SAME-GATE-%');
  });

  it('rejects writes without the curator secret', async () => {
    expect((await write({ action: 'save_draft', record: record(testId) }, {})).status).toBe(401);
  });

  it('R1 saves a draft: stored, but invisible to the public', async () => {
    const before = await stats();
    const res = await write({ action: 'save_draft', record: record(testId) });
    expect(res.status).toBe(201);
    const { experiment } = await res.json();
    id = experiment.id;
    expect(experiment.verified_by).toBeNull();
    expect(await publicRows(testId)).toEqual([]);
    expect((await stats()).in_review).toBe(before.in_review + 1);
  });

  it('R1 lists and reopens the draft', async () => {
    const { items } = await (await list()).json();
    expect(items.find((i: { id: string }) => i.id === id)).toMatchObject({ status: 'draft', test_id: testId });
    const { experiment } = await (await list(`?id=${id}`)).json();
    expect(experiment.test_id).toBe(testId);
  });

  it('R1 corrects it — still a draft', async () => {
    const res = await write({ action: 'save_draft', id, record: { ...record(testId), thickness_mm: 1.5, notes: 'corrected per Table 2' } });
    expect(res.status).toBe(200);
    expect((await res.json()).experiment).toMatchObject({ thickness_mm: 1.5, verified_by: null });
    expect(await publicRows(testId)).toEqual([]);
  });

  it('publication under a placeholder or blank name is rejected', async () => {
    for (const name of ['Part 1 lead (placeholder)', 'TBD', '  ']) {
      const res = await write({ action: 'publish', id, record: record(testId), verified_by: name });
      expect(res.status).toBe(400);
    }
    expect(await publicRows(testId)).toEqual([]);
  });

  it('a named reviewer publishes: now public, catalog revision changes', async () => {
    const before = await stats();
    const res = await write({ action: 'publish', id, record: { ...record(testId), thickness_mm: 1.5 }, verified_by: 'Ada Reviewer' });
    expect(res.status).toBe(200);
    expect((await res.json()).experiment).toMatchObject({ verified_by: 'Ada Reviewer' });
    expect(await publicRows(testId)).toEqual([{ id, verified_by: 'Ada Reviewer' }]);
    const after = await stats();
    expect(after.verified).toBe(before.verified + 1);
    expect(after.revision).not.toBe(before.revision);
  });

  it('saving a correction to a published card un-publishes it until re-verified', async () => {
    const revision = (await stats()).revision;
    await write({ action: 'save_draft', id, record: { ...record(testId), thickness_mm: 2 } });
    expect(await publicRows(testId)).toEqual([]);
    expect((await stats()).revision).not.toBe(revision);
  });

  it('synthesize rejects a verified SAME card in a solid scenario (no provider needed)', async () => {
    const same = await write({
      action: 'publish',
      record: { ...record(`SAME-GATE-${crypto.randomUUID()}`), campaign: 'SAME', domain: 'smoke_detection' },
      verified_by: 'Ada Reviewer',
    });
    const sameId = (await same.json()).experiment.id;
    const res = await synthesize(
      new Request('http://x/api/synthesize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenario: {
            domain: 'solid_flammability',
            material: { status: 'resolved', raw: null, fuel_material: 'PMMA', material_class: 'thermoplastic', via: 'picker' },
            fuel_form: 'flat_sheet',
            thickness_mm: null,
            o2_pct: 21,
            flow_cm_s: 10,
            pressure_kpa: null,
          },
          experiment_ids: [sameId],
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatchObject({ code: 'ineligible_evidence', issues: [{ message: 'domain_mismatch' }] });
  });
});
