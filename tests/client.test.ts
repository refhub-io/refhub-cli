// tests/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient, RefHubError, resolveClient } from '../src/client.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }));
}

describe('RefHubClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('attaches Authorization header to requests', async () => {
    mockFetch({ data: [] });
    const client = new RefHubClient('rhk_test_key');
    await client.listVaults();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://refhub-api.netlify.app/api/v1/vaults',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer rhk_test_key' }),
      })
    );
  });

  it('throws RefHubError on non-ok response', async () => {
    mockFetch(
      { error: { code: 'missing_scope', message: 'No scope', request_id: 'req_1' } },
      false,
      403
    );
    const client = new RefHubClient('rhk_test_key');
    await expect(client.listVaults()).rejects.toThrow(RefHubError);
  });

  it('RefHubError has code, message, request_id, status', async () => {
    mockFetch(
      { error: { code: 'item_not_found', message: 'Not found', request_id: 'req_2' } },
      false,
      404
    );
    const client = new RefHubClient('rhk_test_key');
    let err: RefHubError | undefined;
    try { await client.listVaults(); } catch (e) { err = e as RefHubError; }
    expect(err?.code).toBe('item_not_found');
    expect(err?.status).toBe(404);
    expect(err?.request_id).toBe('req_2');
  });

  it('RefHubError includes retry_after_seconds on 429', async () => {
    mockFetch(
      { error: { code: 'rate_limit_exceeded', message: 'slow down', request_id: 'req_3' }, retry_after_seconds: 5 },
      false,
      429
    );
    const client = new RefHubClient('rhk_test_key');
    let err: RefHubError | undefined;
    try { await client.listVaults(); } catch (e) { err = e as RefHubError; }
    expect(err?.retry_after_seconds).toBe(5);
  });
});

describe('resolveClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a client when --api-key is passed', () => {
    const client = resolveClient('rhk_explicit');
    expect(client).toBeInstanceOf(RefHubClient);
  });

  it('returns a client when REFHUB_API_KEY is set', () => {
    process.env['REFHUB_API_KEY'] = 'rhk_from_env';
    const client = resolveClient(undefined);
    expect(client).toBeInstanceOf(RefHubClient);
    delete process.env['REFHUB_API_KEY'];
  });

  it('exits with code 3 when no key is available', () => {
    delete process.env['REFHUB_API_KEY'];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    expect(() => resolveClient(undefined)).toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(3);
    vi.restoreAllMocks();
  });
});
