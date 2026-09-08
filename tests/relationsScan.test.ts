// tests/relationsScan.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import { findMatchingItem, scanItemRelations } from '../src/commands/relationsScan.js';
import type { Item, Relation, SemanticScholarPaper } from '../src/types.js';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    vault_id: 'vault-1',
    original_publication_id: 'pub-1',
    title: 'Attention Is All You Need',
    authors: ['Vaswani A'],
    year: 2017,
    doi: '10.48550/arXiv.1706.03762',
    tag_ids: [],
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePaper(overrides: Partial<SemanticScholarPaper> = {}): SemanticScholarPaper {
  return {
    paper_id: 'p1',
    title: 'Some Paper',
    external_ids: {},
    ...overrides,
  };
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) };
}

describe('findMatchingItem', () => {
  const sibling = makeItem({ id: 'item-2', doi: '10.1/sibling', title: 'Sibling Paper' });
  const items = [makeItem(), sibling];

  it('matches by DOI, case-insensitively and ignoring a doi.org prefix', () => {
    const paper = makePaper({ external_ids: { DOI: 'https://doi.org/10.1/SIBLING' } });
    expect(findMatchingItem(paper, items, 'item-1')).toBe(sibling);
  });

  it('falls back to exact title match, trimmed and case-insensitive', () => {
    const paper = makePaper({ external_ids: {}, title: '  sibling PAPER  ' });
    expect(findMatchingItem(paper, items, 'item-1')).toBe(sibling);
  });

  it('excludes the source item itself from matching', () => {
    const paper = makePaper({ external_ids: { DOI: makeItem().doi }, title: makeItem().title });
    expect(findMatchingItem(paper, items, 'item-1')).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    const paper = makePaper({ external_ids: { DOI: '10.9/unrelated' }, title: 'Unrelated Paper' });
    expect(findMatchingItem(paper, items, 'item-1')).toBeUndefined();
  });
});

describe('scanItemRelations', () => {
  let client: RefHubClient;

  beforeEach(() => {
    client = new RefHubClient('rhk_test');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns skipped_no_doi for items without a DOI', async () => {
    const item = makeItem({ doi: undefined });
    const result = await scanItemRelations(item, client, 'vault-1', [item], [], { dryRun: false });
    expect(result).toEqual({ outcome: 'skipped_no_doi', suggested: 0, created: 0, skippedDuplicate: 0 });
  });

  it('returns lookup_failed when the lookup returns no paper_id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({ data: { paper_id: null } })));
    const item = makeItem();
    const result = await scanItemRelations(item, client, 'vault-1', [item], [], { dryRun: false });
    expect(result.outcome).toBe('lookup_failed');
  });

  it('creates a cites relation for a matched reference (item cites matched)', async () => {
    const sibling = makeItem({ id: 'item-2', doi: '10.1/sibling', title: 'Sibling Paper' });
    const item = makeItem();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { paper_id: `DOI:${item.doi}` } }))
      .mockResolvedValueOnce(jsonResponse({ data: [makePaper({ external_ids: { DOI: sibling.doi! } })] })) // references
      .mockResolvedValueOnce(jsonResponse({ data: [] })) // citations
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'rel-1' } })); // createRelation
    vi.stubGlobal('fetch', fetchMock);

    const result = await scanItemRelations(item, client, 'vault-1', [item, sibling], [], { dryRun: false });

    expect(result).toEqual({ outcome: 'scanned', suggested: 1, created: 1, skippedDuplicate: 0 });
    const createCall = fetchMock.mock.calls[3];
    expect(String(createCall?.[0])).toContain('/relations');
    const body = JSON.parse(String(createCall?.[1]?.body));
    expect(body).toEqual({ publication_id: item.id, related_publication_id: sibling.id, relation_type: 'cites' });
  });

  it('creates a cites relation for a matched citation (matched cites item)', async () => {
    const sibling = makeItem({ id: 'item-2', doi: '10.1/sibling', title: 'Sibling Paper' });
    const item = makeItem();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { paper_id: `DOI:${item.doi}` } }))
      .mockResolvedValueOnce(jsonResponse({ data: [] })) // references
      .mockResolvedValueOnce(jsonResponse({ data: [makePaper({ external_ids: { DOI: sibling.doi! } })] })) // citations
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'rel-1' } })); // createRelation
    vi.stubGlobal('fetch', fetchMock);

    const result = await scanItemRelations(item, client, 'vault-1', [item, sibling], [], { dryRun: false });

    expect(result).toEqual({ outcome: 'scanned', suggested: 1, created: 1, skippedDuplicate: 0 });
    const body = JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body));
    expect(body).toEqual({ publication_id: sibling.id, related_publication_id: item.id, relation_type: 'cites' });
  });

  it('skips creating a relation that already exists', async () => {
    const sibling = makeItem({ id: 'item-2', doi: '10.1/sibling', title: 'Sibling Paper' });
    const item = makeItem();
    const existing: Relation[] = [{
      id: 'rel-existing', vault_id: 'vault-1', publication_id: item.id, related_publication_id: sibling.id,
      relation_type: 'cites', created_at: '', updated_at: '',
    }];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { paper_id: `DOI:${item.doi}` } }))
      .mockResolvedValueOnce(jsonResponse({ data: [makePaper({ external_ids: { DOI: sibling.doi! } })] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await scanItemRelations(item, client, 'vault-1', [item, sibling], existing, { dryRun: false });

    expect(result).toEqual({ outcome: 'scanned', suggested: 1, created: 0, skippedDuplicate: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // no createRelation call
  });

  it('does not call createRelation in dry-run mode but still counts as created', async () => {
    const sibling = makeItem({ id: 'item-2', doi: '10.1/sibling', title: 'Sibling Paper' });
    const item = makeItem();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { paper_id: `DOI:${item.doi}` } }))
      .mockResolvedValueOnce(jsonResponse({ data: [makePaper({ external_ids: { DOI: sibling.doi! } })] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await scanItemRelations(item, client, 'vault-1', [item, sibling], [], { dryRun: true });

    expect(result).toEqual({ outcome: 'scanned', suggested: 1, created: 1, skippedDuplicate: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // lookup + references + citations only
  });

  it('returns no_matches when no returned papers match a sibling item', async () => {
    const item = makeItem();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { paper_id: `DOI:${item.doi}` } }))
      .mockResolvedValueOnce(jsonResponse({ data: [makePaper({ external_ids: { DOI: '10.9/unrelated' }, title: 'Unrelated' })] }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await scanItemRelations(item, client, 'vault-1', [item], [], { dryRun: false });

    expect(result).toEqual({ outcome: 'no_matches', suggested: 0, created: 0, skippedDuplicate: 0 });
  });
});
