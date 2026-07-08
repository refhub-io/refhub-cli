// tests/client.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('RefHubClient API-key agent routes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses namespaced Semantic Scholar DOI metadata route with API key', async () => {
    mockFetch({ data: null });
    const client = new RefHubClient('rhk_test_key');
    await client.doiMetadata('10.1/x');
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/semantic-scholar/doi-metadata');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer rhk_test_key');
  });

  it('uses per_page and tag query names for search/list contracts', async () => {
    mockFetch({ data: [] });
    const client = new RefHubClient('rhk_test_key');
    await client.searchItems('vault-1', { tag_id: 'tag-1', limit: 10, doi: '10.1/x' });
    const [url] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.searchParams.get('tag')).toBe('tag-1');
    expect(parsed.searchParams.get('per_page')).toBe('10');
    expect(parsed.searchParams.get('doi')).toBe('10.1/x');
  });

  it('always uses the resumable Drive upload flow for item PDFs, regardless of size', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { upload_url: 'https://drive.example/upload-session', file_name: 'Small.pdf' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'drive-file-1', webViewLink: 'https://drive.example/view' }),
        text: () => Promise.resolve(''),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { stored: true, provider: 'google_drive', fileId: 'drive-file-1' } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new RefHubClient('rhk_test_key');
    const pdf = Buffer.from('%PDF-small');

    await client.uploadItemPdf('vault-1', 'item-1', pdf);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [sessionUrl, sessionInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(sessionUrl).toContain('/vaults/vault-1/items/item-1/pdf/session');
    expect((sessionInit.headers as Record<string, string>)['Authorization']).toBe('Bearer rhk_test_key');

    const [driveUrl, driveInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(driveUrl).toBe('https://drive.example/upload-session');
    expect(driveInit.method).toBe('PUT');
    expect((driveInit.headers as Record<string, string>)['Content-Type']).toBe('application/pdf');
    expect((driveInit.headers as Record<string, string>)['Content-Length']).toBe(String(pdf.length));
    expect(driveInit.body).toBe(pdf);

    const [completeUrl, completeInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(completeUrl).toContain('/vaults/vault-1/items/item-1/pdf/complete');
    expect(JSON.parse(String(completeInit.body))).toEqual({
      file_id: 'drive-file-1',
      web_view_link: 'https://drive.example/view',
    });
  });
});
