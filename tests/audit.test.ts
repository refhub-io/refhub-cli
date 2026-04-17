// tests/audit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import { handleAudit } from '../src/commands/audit.js';

function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('audit command', () => {
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

  it('handleAudit calls GET /audit', async () => {
    mockFetch({ data: [] });
    await handleAudit(client, 'v1', {}, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/audit'),
      expect.any(Object)
    );
  });

  it('handleAudit passes since and limit in query string', async () => {
    mockFetch({ data: [] });
    await handleAudit(client, 'v1', { since: '2026-01-01T00:00:00Z', limit: 10 }, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('since='),
      expect.any(Object)
    );
  });

  it('handleAudit outputs entries as JSON', async () => {
    mockFetch({ data: [{ id: 'a1', action: 'item.created' }] });
    await handleAudit(client, 'v1', {}, false);
    const out = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0]));
    expect(out.data[0].id).toBe('a1');
  });
});
