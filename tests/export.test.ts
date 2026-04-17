// tests/export.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import { handleExport } from '../src/commands/export.js';

function mockFetchText(body: string, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  }));
}

describe('export command', () => {
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

  it('handleExport writes raw text to stdout', async () => {
    mockFetchText('{"items":[]}');
    await handleExport(client, 'v1', 'json');
    expect(String(stdoutSpy.mock.calls[0]?.[0])).toContain('{"items":[]}');
  });

  it('handleExport calls export endpoint with format param', async () => {
    mockFetchText('@article{key}');
    await handleExport(client, 'v1', 'bibtex');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('format=bibtex'),
      expect.any(Object)
    );
  });
});
