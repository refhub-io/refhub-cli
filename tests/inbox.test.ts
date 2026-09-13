import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleInboxList,
  handleInboxCaptureDoi,
  handleInboxCaptureBibtex,
  handleInboxCaptureManual,
  handleInboxAccept,
  handleInboxReject,
  handleInboxMerge,
  handleInboxPostpone,
  handleInboxDelete,
} from '../src/commands/inbox.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

function exitSpyThrows() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code})`);
  }) as never);
}

describe('inbox commands', () => {
  let client: RefHubClient;

  beforeEach(() => {
    client = new RefHubClient('rhk_test');
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('handleInboxList calls GET /inbox', async () => {
    mockFetch({ data: [] });
    await handleInboxList(client, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/inbox'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('handleInboxCaptureDoi sends source_type doi and the doi as source_ref', async () => {
    mockFetch({ data: { id: 'i1', status: 'pending' } });
    await handleInboxCaptureDoi(client, '10.1/x', false);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/inbox');
    expect(String(url)).not.toContain('/inbox/');
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ source_type: 'doi', source_ref: '10.1/x' });
  });

  it('handleInboxCaptureBibtex sends source_type bibtex and returns an array', async () => {
    mockFetch({ data: [{ id: 'i1' }, { id: 'i2' }] });
    await handleInboxCaptureBibtex(client, '@article{a,}', false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ source_type: 'bibtex', source_ref: '@article{a,}' });
  });

  it('handleInboxCaptureManual sends source_type manual with parsed_fields.title', async () => {
    mockFetch({ data: { id: 'i1' } });
    await handleInboxCaptureManual(client, 'A Paper', false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ source_type: 'manual', parsed_fields: { title: 'A Paper' } });
  });

  it('handleInboxAccept sends vault_id and parsed tag_ids to the accept endpoint', async () => {
    mockFetch({ data: { vault_publication_id: 'vp1', publication_id: 'p1' } });
    await handleInboxAccept(client, 'i1', 'v1', 't1,t2', false);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toContain('/inbox/i1/accept');
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({ vault_id: 'v1', tag_ids: ['t1', 't2'] });
  });

  it('handleInboxAccept defaults tag_ids to an empty array when omitted', async () => {
    mockFetch({ data: { vault_publication_id: 'vp1', publication_id: 'p1' } });
    await handleInboxAccept(client, 'i1', 'v1', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.tag_ids).toEqual([]);
  });

  it('handleInboxReject exits 2 with confirm_required when --confirm is missing', async () => {
    const exitSpy = exitSpyThrows();
    vi.stubGlobal('fetch', vi.fn());
    await expect(handleInboxReject(client, 'i1', false)).rejects.toThrow('process.exit(2)');
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handleInboxReject calls POST /inbox/:id/reject when confirmed', async () => {
    mockFetch({ data: { id: 'i1' } });
    await handleInboxReject(client, 'i1', true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/inbox/i1/reject'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handleInboxMerge exits 2 with confirm_required when --confirm is missing', async () => {
    const exitSpy = exitSpyThrows();
    vi.stubGlobal('fetch', vi.fn());
    await expect(handleInboxMerge(client, 'i1', false, false)).rejects.toThrow('process.exit(2)');
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handleInboxMerge calls POST /inbox/:id/merge when confirmed', async () => {
    mockFetch({ data: { id: 'i1', filed_publication_id: 'p1' } });
    await handleInboxMerge(client, 'i1', true, false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/inbox/i1/merge'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handleInboxPostpone calls POST /inbox/:id/postpone without needing --confirm', async () => {
    mockFetch({ data: { id: 'i1', sort_order: 3 } });
    await handleInboxPostpone(client, 'i1', false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/inbox/i1/postpone'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('handleInboxDelete exits 2 with confirm_required when --confirm is missing', async () => {
    const exitSpy = exitSpyThrows();
    vi.stubGlobal('fetch', vi.fn());
    await expect(handleInboxDelete(client, 'i1', false)).rejects.toThrow('process.exit(2)');
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handleInboxDelete calls DELETE /inbox/:id when confirmed', async () => {
    mockFetch({ data: { id: 'i1' } });
    await handleInboxDelete(client, 'i1', true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/inbox/i1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
