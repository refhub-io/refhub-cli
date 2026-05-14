// tests/enrich.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient, ManagementClient } from '../src/client.js';
import { enrichItem } from '../src/commands/enrich.js';
import type { Item } from '../src/types.js';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    vault_id: 'vault-1',
    original_publication_id: 'pub-1',
    title: 'Some Paper',
    authors: ['Smith J'],
    year: 2020,
    doi: '10.1234/test',
    abstract: 'An abstract.',
    tag_ids: [],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const fullMeta = {
  title: 'Full Title',
  authors: ['Doe A', 'Smith B'],
  year: 2021,
  abstract: 'Full abstract.',
  doi: '10.1234/test',
  url: 'https://doi.org/10.1234/test',
  type: 'article',
};

describe('enrichItem', () => {
  let client: RefHubClient;
  let mgmt: ManagementClient;

  beforeEach(() => {
    client = new RefHubClient('rhk_test');
    mgmt = new ManagementClient('jwt_test');
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns skipped for items without a DOI', async () => {
    const item = makeItem({ doi: undefined });
    const outcome = await enrichItem(item, mgmt, client, 'vault-1', false);
    expect(outcome).toBe('skipped');
  });

  it('returns no_missing_fields when all fields are present', async () => {
    const item = makeItem();
    const outcome = await enrichItem(item, mgmt, client, 'vault-1', false);
    expect(outcome).toBe('no_missing_fields');
  });

  it('returns not_found when doi-metadata returns null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: null }),
    }));
    const item = makeItem({ abstract: undefined });
    const outcome = await enrichItem(item, mgmt, client, 'vault-1', false);
    expect(outcome).toBe('not_found');
  });

  it('patches only missing fields and returns enriched', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: fullMeta }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) });
    vi.stubGlobal('fetch', fetchMock);

    const item = makeItem({ abstract: undefined, year: undefined });
    const outcome = await enrichItem(item, mgmt, client, 'vault-1', false);

    expect(outcome).toBe('enriched');
    const patchBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(patchBody).toHaveProperty('abstract', fullMeta.abstract);
    expect(patchBody).toHaveProperty('year', fullMeta.year);
    expect(patchBody).not.toHaveProperty('title');
    expect(patchBody).not.toHaveProperty('authors');
  });

  it('does not call PATCH in dry-run mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ data: fullMeta }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const item = makeItem({ abstract: undefined });
    const outcome = await enrichItem(item, mgmt, client, 'vault-1', true);

    expect(outcome).toBe('enriched');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite fields that already have values', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: fullMeta }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: {} }) });
    vi.stubGlobal('fetch', fetchMock);

    const item = makeItem({ abstract: undefined });
    await enrichItem(item, mgmt, client, 'vault-1', false);

    const patchBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(Object.keys(patchBody)).toEqual(['abstract']);
  });
});
