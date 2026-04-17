import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleRelationsList,
  handleRelationCreate,
  handleRelationUpdate,
  handleRelationDelete,
} from '../src/commands/relations.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('relation commands', () => {
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

  it('handleRelationsList calls GET /relations', async () => {
    mockFetch({ data: [] });
    await handleRelationsList(client, 'v1', undefined, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/relations'),
      expect.any(Object)
    );
  });

  it('handleRelationsList passes type filter in query string', async () => {
    mockFetch({ data: [] });
    await handleRelationsList(client, 'v1', 'cites', false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('type=cites'),
      expect.any(Object)
    );
  });

  it('handleRelationCreate sends publication_id and related_publication_id', async () => {
    mockFetch({ data: { id: 'r1' } });
    await handleRelationCreate(client, 'v1', { pub: 'p1', related: 'p2', type: 'cites' }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.publication_id).toBe('p1');
    expect(body.related_publication_id).toBe('p2');
    expect(body.relation_type).toBe('cites');
  });

  it('handleRelationUpdate sends PATCH with relation_type', async () => {
    mockFetch({ data: { id: 'r1' } });
    await handleRelationUpdate(client, 'v1', 'r1', 'extends', false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.relation_type).toBe('extends');
  });

  it('handleRelationDelete calls DELETE', async () => {
    mockFetch({ data: { id: 'r1' } });
    await handleRelationDelete(client, 'v1', 'r1');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/relations/r1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
