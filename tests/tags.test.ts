// tests/tags.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleTagsList,
  handleTagCreate,
  handleTagUpdate,
  handleTagDelete,
  handleTagAttach,
  handleTagDetach,
} from '../src/commands/tags.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('tag commands', () => {
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

  it('handleTagsList calls GET /tags', async () => {
    mockFetch({ data: [] });
    await handleTagsList(client, 'v1', false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/vaults/v1/tags'),
      expect.any(Object)
    );
  });

  it('handleTagCreate sends name in body', async () => {
    mockFetch({ data: { id: 't1', name: 'ML' } });
    await handleTagCreate(client, 'v1', { name: 'ML', color: undefined, parent: undefined }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.name).toBe('ML');
  });

  it('handleTagDelete calls DELETE /tags/:id', async () => {
    mockFetch({ data: { id: 't1' } });
    await handleTagDelete(client, 'v1', 't1');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/tags/t1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('handleTagAttach sends item_id and tag_ids', async () => {
    mockFetch({ data: { item_id: 'i1', tag_ids: ['t1', 't2'] } });
    await handleTagAttach(client, 'v1', 'i1', 't1,t2');
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.item_id).toBe('i1');
    expect(body.tag_ids).toEqual(['t1', 't2']);
  });

  it('handleTagDetach sends item_id and tag_ids to detach endpoint', async () => {
    mockFetch({ data: { item_id: 'i1', tag_ids: ['t1'] } });
    await handleTagDetach(client, 'v1', 'i1', 't1');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/detach'),
      expect.any(Object)
    );
  });
});
