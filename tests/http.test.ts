import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { rateLimit, requireCurator } from '../src/server/http';

const reqFrom = (ip: string, headers: Record<string, string> = {}) =>
  new Request('http://x/api', { headers: { 'x-forwarded-for': ip, ...headers } });

describe('rateLimit', () => {
  it('allows `limit` requests per window per IP, then 429s', () => {
    const now = 1_000;
    for (let i = 0; i < 3; i++) expect(rateLimit(reqFrom('1.1.1.1'), 't', 3, 60_000, now)).toBeNull();
    expect(rateLimit(reqFrom('1.1.1.1'), 't', 3, 60_000, now)?.status).toBe(429);
    expect(rateLimit(reqFrom('2.2.2.2'), 't', 3, 60_000, now)).toBeNull();
    expect(rateLimit(reqFrom('1.1.1.1'), 't', 3, 60_000, now + 60_001)).toBeNull();
  });
});

describe('requireCurator', () => {
  const saved = process.env.CURATOR_SECRET;
  beforeEach(() => {
    delete process.env.CURATOR_SECRET;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CURATOR_SECRET;
    else process.env.CURATOR_SECRET = saved;
  });
  it('503s when the secret is not configured', () => expect(requireCurator(reqFrom('x'))?.status).toBe(503));
  it('401s on a wrong secret and passes the right one', () => {
    process.env.CURATOR_SECRET = 's3cret';
    expect(requireCurator(reqFrom('x', { 'x-curator-secret': 'nope' }))?.status).toBe(401);
    expect(requireCurator(reqFrom('x', { 'x-curator-secret': 's3cret' }))).toBeNull();
  });
});
