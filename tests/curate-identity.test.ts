import { afterEach, expect, it, vi } from 'vitest';
import { card } from './helpers';

vi.mock('../src/server/db.js', () => ({
  serviceClient: () => ({ from: () => ({ insert: () => ({ select: () => ({
    maybeSingle: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }),
  }) }) }) }),
}));
const { POST } = await import('../api/curate-write');
afterEach(() => vi.unstubAllEnvs());

it('returns an actionable conflict when the database refuses a duplicate run', async () => {
  vi.stubEnv('CURATOR_SECRET', 'identity-unit-test');
  const response = await POST(new Request('http://test/api/curate-write', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-curator-secret': 'identity-unit-test' },
    body: JSON.stringify({ action: 'save_draft', record: card() }),
  }));
  expect(response.status).toBe(409);
  const body = await response.json();
  expect(body.error.code).toBe('duplicate_experiment');
  expect(body.error.message).toContain('Reopen the existing card');
});
