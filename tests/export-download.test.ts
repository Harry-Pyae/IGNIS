/** Round 3, item 5: the header/footer export controls download the real /api/export file. */
import { describe, expect, it, vi } from 'vitest';
import { downloadCatalogExport } from '../src/lib/exportDownload';

const respond = (status: number, body = '{}', disposition?: string) =>
  (async () =>
    new Response(body, { status, headers: disposition ? { 'content-disposition': disposition } : {} })) as unknown as typeof fetch;

describe('downloadCatalogExport', () => {
  it('saves the server file under the server filename (the revision-stamped name)', async () => {
    const save = vi.fn();
    const body = JSON.stringify({ format: 'ignis-catalog-v1', count: 0, experiments: [] });
    const r = await downloadCatalogExport(respond(200, body, 'attachment; filename="ignis-catalog-empty.json"'), save);
    expect(r).toEqual({ ok: true, filename: 'ignis-catalog-empty.json' });
    expect(save).toHaveBeenCalledTimes(1);
    const [blob, name] = save.mock.calls[0]!;
    expect(name).toBe('ignis-catalog-empty.json');
    expect(JSON.parse(await (blob as Blob).text())).toMatchObject({ count: 0, experiments: [] }); // honest empty file, no fixtures
  });

  it('429 / 5xx / network: nothing is saved, the reason is reported (no raw JSON page)', async () => {
    const save = vi.fn();
    expect(await downloadCatalogExport(respond(429), save)).toEqual({ ok: false, reason: 'rate_limited' });
    expect(await downloadCatalogExport(respond(503), save)).toEqual({ ok: false, reason: 'unavailable' });
    const offline = (async () => Promise.reject(new TypeError('offline'))) as unknown as typeof fetch;
    expect(await downloadCatalogExport(offline, save)).toEqual({ ok: false, reason: 'network' });
    expect(save).not.toHaveBeenCalled();
  });
});
