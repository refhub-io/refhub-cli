// tests/items.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleItemsList,
  handleItemGet,
  handleItemAdd,
  handleItemUpdate,
  handleItemDelete,
  handleItemUpsert,
  handleItemPreview,
  handleItemSearch,
  handleItemStats,
  handleItemChanges,
} from '../src/commands/items.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('item commands', () => {
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

  it('handleItemsList calls GET /vaults/:id/items', async () => {
    mockFetch({ data: [] });
    await handleItemsList(client, 'v1', {}, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/vaults/v1/items'),
      expect.any(Object)
    );
  });

  it('handleItemAdd sends single item with title', async () => {
    mockFetch({ data: [{ id: 'i1', title: 'My Paper' }] });
    await handleItemAdd(client, 'v1', { title: 'My Paper', authors: undefined, year: undefined, doi: undefined, tags: undefined }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.items[0].title).toBe('My Paper');
  });

  it('handleItemUpdate warns about tag replacement when --tags passed', async () => {
    mockFetch({ data: { id: 'i1' } });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await handleItemUpdate(client, 'v1', 'i1', { title: undefined, authors: undefined, year: undefined, doi: undefined, tags: 't1,t2' }, false);
    const warnings = stderrSpy.mock.calls.map(c => String(c[0])).join('');
    expect(warnings).toContain('tag_replacement');
  });

  it('handleItemDelete requires --confirm', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(handleItemDelete(client, 'v1', 'i1', false)).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('handleItemUpsert reads items from JSON file and sends to upsert endpoint', async () => {
    mockFetch({ data: { created: [{ id: 'i1', title: 'Paper A' }], updated: [], errors: [] } });
    const { writeFileSync, unlinkSync } = await import('fs');
    const tmpPath = '/tmp/refhub-test-items.json';
    writeFileSync(tmpPath, JSON.stringify([{ title: 'Paper A' }]));
    await handleItemUpsert(client, 'v1', tmpPath, undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.items[0].title).toBe('Paper A');
    unlinkSync(tmpPath);
  });

  it('handleItemSearch calls search endpoint', async () => {
    mockFetch({ data: [] });
    await handleItemSearch(client, 'v1', { q: 'attention' }, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/search'),
      expect.any(Object)
    );
  });

  it('handleItemStats outputs stats', async () => {
    mockFetch({ data: { item_count: 5, tag_count: 2, relation_count: 1, last_updated: '2026-01-01' } });
    await handleItemStats(client, 'v1', false);
    const out = JSON.parse(String(stdoutSpy.mock.calls[0]?.[0]));
    expect(out.data.item_count).toBe(5);
  });
});
