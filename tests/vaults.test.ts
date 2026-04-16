// tests/vaults.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleVaultsList,
  handleVaultGet,
  handleVaultCreate,
  handleVaultUpdate,
  handleVaultDelete,
  handleVaultVisibility,
  handleSharesList,
  handleShareAdd,
  handleShareUpdate,
  handleShareRemove,
} from '../src/commands/vaults.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('vault commands', () => {
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

  it('handleVaultsList outputs vault list as JSON', async () => {
    mockFetch({ data: [{ id: 'v1', name: 'Test' }] });
    await handleVaultsList(client, false);
    const out = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0]));
    expect(out.data[0].id).toBe('v1');
  });

  it('handleVaultGet calls GET /vaults/:id', async () => {
    mockFetch({ data: { id: 'v1', name: 'Test', items: [] } });
    await handleVaultGet(client, 'v1', false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/vaults/v1'),
      expect.any(Object)
    );
  });

  it('handleVaultCreate sends POST with name', async () => {
    mockFetch({ data: { id: 'v2', name: 'New' } });
    await handleVaultCreate(client, { name: 'New', description: undefined, color: undefined, visibility: undefined, category: undefined }, false);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ name: 'New' });
  });

  it('handleVaultDelete requires --confirm (exits 2 without it)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(handleVaultDelete(client, 'v1', false)).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('handleVaultDelete calls DELETE when confirmed', async () => {
    mockFetch({ data: { id: 'v1' } });
    await handleVaultDelete(client, 'v1', true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/vaults/v1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('handleVaultVisibility sends PATCH to visibility endpoint', async () => {
    mockFetch({ data: { id: 'v1' } });
    await handleVaultVisibility(client, 'v1', { visibility: 'public', slug: 'my-vault' }, false);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call?.[0]).toContain('/visibility');
  });

  it('handleSharesList calls GET /shares', async () => {
    mockFetch({ data: [] });
    await handleSharesList(client, 'v1', false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/shares'),
      expect.any(Object)
    );
  });

  it('handleShareAdd sends email and role', async () => {
    mockFetch({ data: { id: 's1' } });
    await handleShareAdd(client, 'v1', { email: 'a@b.com', role: 'viewer', name: undefined }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.email).toBe('a@b.com');
    expect(body.role).toBe('viewer');
  });
});
