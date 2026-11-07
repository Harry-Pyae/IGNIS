/**
 * §10: an UNVERIFIED row must be invisible to the anon (public) client, and anon cannot write.
 * Runs against the real Supabase project; skipped when env vars are absent (e.g. CI).
 */
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = process.env;
const opts = { auth: { persistSession: false } };

describe.skipIf(!url || !anonKey || !serviceKey)('RLS on experiments', () => {
  it('hides unverified rows from anon and blocks anon writes', async () => {
    const service = createClient(url!, serviceKey!, opts);
    const anon = createClient(url!, anonKey!, opts);
    const marker = `RLS-TEST-${crypto.randomUUID()}`;
    const { data: row, error } = await service
      .from('experiments')
      .insert({
        campaign: 'BASS', test_id: marker, fuel_material: 'PMMA', material_class: 'thermoplastic',
        fuel_form: 'flat_sheet', outcome: 'sustained', key_observation_quote: 'RLS test row',
        source_title: 'RLS test', source_url: 'https://example.org', verified_by: null,
      })
      .select('id')
      .single();
    expect(error).toBeNull();
    try {
      const { data: seen } = await anon.from('experiments').select('id').eq('test_id', marker);
      expect(seen).toEqual([]);

      await anon.from('experiments').update({ verified_by: 'anon' }).eq('id', row!.id);
      const { data: after } = await service.from('experiments').select('verified_by').eq('id', row!.id).single();
      expect(after?.verified_by).toBeNull();
    } finally {
      await service.from('experiments').delete().eq('id', row!.id);
    }
  }, 20_000);
});
