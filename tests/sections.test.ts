// tests/sections.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleSectionsList,
  handleSectionCreate,
  handleSectionUpdate,
  handleSectionDelete,
} from '../src/commands/sections.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('section commands', () => {
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

  it('handleSectionsList calls GET /sections', async () => {
    mockFetch({ data: [] });
    await handleSectionsList(client, 'v1', false);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/vaults/v1/sections'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('handleSectionCreate sends name/description/position in body', async () => {
    mockFetch({ data: { id: 's1', name: 'Methods' } });
    await handleSectionCreate(client, 'v1', { name: 'Methods', description: 'core papers', position: 2 }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ name: 'Methods', description: 'core papers', position: 2 });
  });

  it('handleSectionCreate omits description/position when not given', async () => {
    mockFetch({ data: { id: 's1', name: 'Methods' } });
    await handleSectionCreate(client, 'v1', { name: 'Methods' }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ name: 'Methods' });
  });

  it('handleSectionUpdate sends only provided fields', async () => {
    mockFetch({ data: { id: 's1', name: 'Renamed' } });
    await handleSectionUpdate(client, 'v1', 's1', { name: 'Renamed' }, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ name: 'Renamed' });
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/sections/s1'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('handleSectionDelete calls DELETE /sections/:id', async () => {
    mockFetch({ data: { id: 's1' } });
    await handleSectionDelete(client, 'v1', 's1');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/sections/s1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
