/**
 * §10 access matrix against a real Postgres + PostgREST (npm run test:db, or a disposable project).
 * Verified rows visible · drafts invisible · anon insert/update/delete denied · private tables denied ·
 * catalog_stats exposes counts only.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, dbTestsEnabled, record, service } from './env';

describe.skipIf(!dbTestsEnabled)('RLS access matrix', () => {
  const tag = `RLS-${crypto.randomUUID()}`;
  let draftId = '';
  let verifiedId = '';

  beforeAll(async () => {
    const rows = await service()
      .from('experiments')
      .insert([
        { ...record(`${tag}-draft`), verified_by: null },
        { ...record(`${tag}-verified`), verified_by: 'Ada Reviewer', verified_at: new Date().toISOString() },
      ])
      .select('id, verified_by');
    expect(rows.error).toBeNull();
    draftId = rows.data!.find((r) => !r.verified_by)!.id;
    verifiedId = rows.data!.find((r) => r.verified_by)!.id;
  });
  afterAll(async () => {
    await service().from('experiments').delete().like('test_id', `${tag}%`);
  });

  it('anon sees verified rows', async () => {
    const { data } = await anon().from('experiments').select('id').eq('id', verifiedId);
    expect(data).toHaveLength(1);
  });

  it('anon cannot see drafts', async () => {
    const { data } = await anon().from('experiments').select('id').eq('id', draftId);
    expect(data).toEqual([]);
  });

  it('anon cannot insert, update or delete', async () => {
    const ins = await anon().from('experiments').insert({ ...record(`${tag}-anon`), verified_by: 'Anon Writer' });
    expect(ins.error).not.toBeNull();
    await anon().from('experiments').update({ verified_by: 'Hijacker Name' }).eq('id', draftId);
    await anon().from('experiments').delete().eq('id', verifiedId);
    const { data } = await service().from('experiments').select('id, verified_by').in('id', [draftId, verifiedId]);
    expect(data).toHaveLength(2);
    expect(data!.find((r) => r.id === draftId)!.verified_by).toBeNull();
  });

  it('anon cannot read or write the private tables', async () => {
    for (const table of ['scenarios_log', 'briefings_cache']) {
      const read = await anon().from(table).select('*').limit(1);
      expect(read.error ?? read.data?.length === 0).toBeTruthy();
      const write = await anon().from(table).insert({});
      expect(write.error).not.toBeNull();
    }
  });

  it('the database itself rejects a placeholder verifier', async () => {
    const { error } = await service().from('experiments').update({ verified_by: 'Part 1 lead (placeholder)' }).eq('id', draftId);
    expect(error?.message).toMatch(/verified_by_is_a_real_name/);
  });

  it('catalog_stats is callable by anon and returns counts only', async () => {
    const { data, error } = await anon().rpc('catalog_stats');
    expect(error).toBeNull();
    expect(Object.keys(data).sort()).toEqual(['campaigns', 'in_review', 'last_updated', 'revision', 'verified']);
    expect(data.in_review).toBeGreaterThanOrEqual(1);
  });
});
