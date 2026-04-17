// tests/import.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleImportDoi,
  handleImportBibtex,
  handleImportUrl,
} from '../src/commands/import.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('import commands', () => {
  let client: RefHubClient;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = new RefHubClient('rhk_test');
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('handleImportDoi sends doi in body', async () => {
    mockFetch({ data: { item: { id: 'i1', title: 'Paper' } } });
    await handleImportDoi(client, 'v1', '10.1234/test', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.doi).toBe('10.1234/test');
    expect(body.tag_ids).toEqual([]);
  });

  it('handleImportDoi parses --tags into tag_ids array', async () => {
    mockFetch({ data: { item: { id: 'i1' } } });
    await handleImportDoi(client, 'v1', '10.1234/test', 't1,t2', false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.tag_ids).toEqual(['t1', 't2']);
  });

  it('handleImportBibtex sends bibtex string', async () => {
    mockFetch({ data: { created: [], skipped: [] } });
    await handleImportBibtex(client, 'v1', '@article{key, title={T}}', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.bibtex).toContain('@article');
  });

  it('handleImportUrl sends url in body', async () => {
    mockFetch({ data: { item: { id: 'i1' } } });
    await handleImportUrl(client, 'v1', 'https://arxiv.org/abs/2301.00001', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.url).toBe('https://arxiv.org/abs/2301.00001');
  });
});
