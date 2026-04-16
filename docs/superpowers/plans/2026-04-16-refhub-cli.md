# RefHub CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript/Node CLI (`refhub`) that is the execution layer for the RefHub agent skill, covering the full v2 public API surface with JSON-default output and an optional `--table` flag.

**Architecture:** Commander.js handles subcommand parsing with global `--api-key` and `--table` flags. `RefHubClient` encapsulates all HTTP calls with typed methods and throws `RefHubError` on failures. `format()` writes to stdout. Command handlers are exported as plain async functions for unit testing; Commander wiring is a thin registration layer on top. Errors always go to stderr as JSON; exit codes 0/1/2/3 distinguish success, API error, bad args, and auth error.

**Tech Stack:** TypeScript 5, Node 20+, Commander 12, cli-table3, chalk 5, Vitest 1

---

## File map

| Path | Responsibility |
|------|----------------|
| `src/index.ts` | Entry point, Commander root program, `resolveClient()`, `run()` |
| `src/types.ts` | All API response shapes — interfaces only, no logic |
| `src/client.ts` | `RefHubClient` class, `RefHubError`, `resolveClient()`, `run()` |
| `src/format.ts` | `format(data, tableMode, columns?)` — writes to stdout |
| `src/commands/vaults.ts` | Vault command handlers + Commander registration |
| `src/commands/items.ts` | Item command handlers + Commander registration |
| `src/commands/tags.ts` | Tag command handlers + Commander registration |
| `src/commands/relations.ts` | Relation command handlers + Commander registration |
| `src/commands/import.ts` | Import command handlers + Commander registration |
| `src/commands/export.ts` | Export command handler + Commander registration |
| `src/commands/audit.ts` | Audit command handler + Commander registration |
| `tests/client.test.ts` | Unit tests for RefHubClient and error handling |
| `tests/format.test.ts` | Unit tests for format() |
| `tests/vaults.test.ts` | Unit tests for vault command handlers |
| `tests/items.test.ts` | Unit tests for item command handlers |
| `tests/tags.test.ts` | Unit tests for tag command handlers |
| `tests/relations.test.ts` | Unit tests for relation command handlers |
| `tests/import.test.ts` | Unit tests for import command handlers |
| `tests/export.test.ts` | Unit tests for export command handler |
| `tests/audit.test.ts` | Unit tests for audit command handler |
| `scripts/smoke.ts` | Live end-to-end smoke test against real API |

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (stub)

- [ ] **Step 1: Write package.json**

```json
{
  "name": "refhub-cli",
  "version": "0.1.0",
  "description": "CLI execution layer for the RefHub agent skill",
  "type": "module",
  "engines": { "node": ">=18" },
  "bin": { "refhub": "dist/index.js" },
  "scripts": {
    "build": "tsc && node -e \"import('fs').then(fs=>{ const f='dist/index.js'; fs.writeFileSync(f,'#!/usr/bin/env node\\n'+fs.readFileSync(f,'utf8')); fs.chmodSync(f,'755'); })\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "smoke": "tsx scripts/smoke.ts",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/cli-table3": "^0.6.4",
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "scripts", "tests"]
}
```

- [ ] **Step 3: Write vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write src/index.ts stub**

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('refhub')
  .description('RefHub CLI — manage vaults, items, tags, and relations')
  .version('0.1.0')
  .option('--api-key <key>', 'RefHub API key (overrides REFHUB_API_KEY env var)')
  .option('--table', 'human-readable table output (default: JSON)');

program.parseAsync();
```

- [ ] **Step 5: Install dependencies and verify TypeScript compiles**

```bash
cd /home/velitchko/Documents/Projects/refhub/refhub-cli
npm install
npm run build
```

Expected: `dist/index.js` created with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts src/index.ts
git commit -m "feat: project scaffold — commander, vitest, typescript"
```

---

### Task 2: API types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write src/types.ts**

```typescript
export type RelationType =
  | 'cites'
  | 'extends'
  | 'builds_on'
  | 'contradicts'
  | 'reviews'
  | 'related';

export interface Vault {
  id: string;
  name: string;
  description?: string;
  color?: string;
  visibility: 'private' | 'protected' | 'public';
  category?: string;
  abstract?: string;
  public_slug?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  vault_id: string;
  publication_id: string;
  title: string;
  authors?: string;
  year?: number;
  doi?: string;
  bibtex_key?: string;
  abstract?: string;
  tag_ids: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  vault_id: string;
  name: string;
  color?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Relation {
  id: string;
  vault_id: string;
  publication_id: string;
  related_publication_id: string;
  relation_type: RelationType;
  created_at: string;
  updated_at: string;
}

export interface Share {
  id: string;
  vault_id: string;
  email: string;
  role: 'viewer' | 'editor';
  name?: string;
  created_at: string;
}

export interface VaultDetail extends Vault {
  items: Item[];
  tags: Tag[];
  relations: Relation[];
}

export interface VaultStats {
  item_count: number;
  tag_count: number;
  relation_count: number;
  last_updated: string;
}

export interface UpsertResult {
  created: Item[];
  updated: Item[];
  errors: Array<{ item: unknown; error: string }>;
}

export interface PreviewResult {
  would_create: Item[];
  would_update: Item[];
  invalid: Array<{ item: unknown; error: string }>;
}

export interface BibTeXImportResult {
  created: Item[];
  skipped: string[];
}

export interface AuditEntry {
  id: string;
  vault_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
}
```

- [ ] **Step 2: Verify tsc still passes**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add API response types"
```

---

### Task 3: RefHubClient

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`

- [ ] **Step 1: Write failing tests for RefHubClient constructor and request method**

```typescript
// tests/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient, RefHubError, resolveClient } from '../src/client.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  }));
}

describe('RefHubClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('attaches Authorization header to requests', async () => {
    mockFetch({ data: [] });
    const client = new RefHubClient('rhk_test_key');
    await client.listVaults();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://refhub-api.netlify.app/api/v1/vaults',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer rhk_test_key' }),
      })
    );
  });

  it('throws RefHubError on non-ok response', async () => {
    mockFetch(
      { error: { code: 'missing_scope', message: 'No scope', request_id: 'req_1' } },
      false,
      403
    );
    const client = new RefHubClient('rhk_test_key');
    await expect(client.listVaults()).rejects.toThrow(RefHubError);
  });

  it('RefHubError has code, message, request_id, status', async () => {
    mockFetch(
      { error: { code: 'item_not_found', message: 'Not found', request_id: 'req_2' } },
      false,
      404
    );
    const client = new RefHubClient('rhk_test_key');
    let err: RefHubError | undefined;
    try { await client.listVaults(); } catch (e) { err = e as RefHubError; }
    expect(err?.code).toBe('item_not_found');
    expect(err?.status).toBe(404);
    expect(err?.request_id).toBe('req_2');
  });

  it('RefHubError includes retry_after_seconds on 429', async () => {
    mockFetch(
      { error: { code: 'rate_limit_exceeded', message: 'slow down', request_id: 'req_3' }, retry_after_seconds: 5 },
      false,
      429
    );
    const client = new RefHubClient('rhk_test_key');
    let err: RefHubError | undefined;
    try { await client.listVaults(); } catch (e) { err = e as RefHubError; }
    expect(err?.retry_after_seconds).toBe(5);
  });
});

describe('resolveClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a client when --api-key is passed', () => {
    const client = resolveClient('rhk_explicit');
    expect(client).toBeInstanceOf(RefHubClient);
  });

  it('returns a client when REFHUB_API_KEY is set', () => {
    process.env['REFHUB_API_KEY'] = 'rhk_from_env';
    const client = resolveClient(undefined);
    expect(client).toBeInstanceOf(RefHubClient);
    delete process.env['REFHUB_API_KEY'];
  });

  it('exits with code 3 when no key is available', () => {
    delete process.env['REFHUB_API_KEY'];
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    expect(() => resolveClient(undefined)).toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(3);
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: multiple failures — `RefHubClient`, `RefHubError`, `resolveClient` not defined.

- [ ] **Step 3: Write src/client.ts — vault methods**

```typescript
// src/client.ts
import type {
  ApiResponse, Vault, VaultDetail, Share,
  Item, UpsertResult, PreviewResult,
  Tag, Relation, BibTeXImportResult, AuditEntry, VaultStats,
} from './types.js';

export class RefHubError extends Error {
  readonly code: string;
  readonly request_id: string;
  readonly status: number;
  readonly retry_after_seconds?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    request_id: string,
    retry_after_seconds?: number,
  ) {
    super(message);
    this.name = 'RefHubError';
    this.status = status;
    this.code = code;
    this.request_id = request_id;
    this.retry_after_seconds = retry_after_seconds;
  }
}

export class RefHubClient {
  private readonly baseUrl = 'https://refhub-api.netlify.app/api/v1';
  private readonly headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
      const err = (payload['error'] ?? {}) as Record<string, unknown>;
      throw new RefHubError(
        res.status,
        String(err['code'] ?? 'unknown_error'),
        String(err['message'] ?? `HTTP ${res.status}`),
        String(err['request_id'] ?? ''),
        typeof payload['retry_after_seconds'] === 'number' ? payload['retry_after_seconds'] : undefined,
      );
    }
    return res.json() as Promise<T>;
  }

  private async reqText(method: string, path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, { method, headers: this.headers });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({})) as Record<string, unknown>;
      const err = (payload['error'] ?? {}) as Record<string, unknown>;
      throw new RefHubError(
        res.status,
        String(err['code'] ?? 'unknown_error'),
        String(err['message'] ?? `HTTP ${res.status}`),
        String(err['request_id'] ?? ''),
      );
    }
    return res.text();
  }

  // ── Vaults ──────────────────────────────────────────────────────────────────

  listVaults() {
    return this.req<ApiResponse<Vault[]>>('GET', '/vaults');
  }

  getVault(vaultId: string) {
    return this.req<ApiResponse<VaultDetail>>('GET', `/vaults/${vaultId}`);
  }

  createVault(body: { name: string; description?: string; color?: string; visibility?: string; category?: string; abstract?: string }) {
    return this.req<ApiResponse<Vault>>('POST', '/vaults', body);
  }

  updateVault(vaultId: string, body: { name?: string; description?: string; color?: string; category?: string; abstract?: string }) {
    return this.req<ApiResponse<Vault>>('PATCH', `/vaults/${vaultId}`, body);
  }

  deleteVault(vaultId: string) {
    return this.req<ApiResponse<{ id: string }>>('DELETE', `/vaults/${vaultId}`);
  }

  setVaultVisibility(vaultId: string, body: { visibility: string; public_slug?: string }) {
    return this.req<ApiResponse<Vault>>('PATCH', `/vaults/${vaultId}/visibility`, body);
  }

  listShares(vaultId: string) {
    return this.req<ApiResponse<Share[]>>('GET', `/vaults/${vaultId}/shares`);
  }

  addShare(vaultId: string, body: { email: string; role: 'viewer' | 'editor'; name?: string }) {
    return this.req<ApiResponse<Share>>('POST', `/vaults/${vaultId}/shares`, body);
  }

  updateShare(vaultId: string, shareId: string, body: { role: 'viewer' | 'editor' }) {
    return this.req<ApiResponse<Share>>('PATCH', `/vaults/${vaultId}/shares/${shareId}`, body);
  }

  removeShare(vaultId: string, shareId: string) {
    return this.req<ApiResponse<{ id: string }>>('DELETE', `/vaults/${vaultId}/shares/${shareId}`);
  }

  // ── Items ────────────────────────────────────────────────────────────────────

  listItems(vaultId: string, params: { page?: number; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.page !== undefined) q.set('page', String(params.page));
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q}` : '';
    return this.req<ApiResponse<Item[]>>('GET', `/vaults/${vaultId}/items${qs}`);
  }

  getItem(vaultId: string, itemId: string) {
    return this.req<ApiResponse<Item>>('GET', `/vaults/${vaultId}/items/${itemId}`);
  }

  addItems(vaultId: string, items: Array<{ title: string; authors?: string; year?: number; doi?: string; tag_ids?: string[] }>) {
    return this.req<ApiResponse<Item[]>>('POST', `/vaults/${vaultId}/items`, { items });
  }

  updateItem(vaultId: string, itemId: string, body: { title?: string; authors?: string; year?: number; doi?: string; tag_ids?: string[] }) {
    return this.req<ApiResponse<Item>>('PATCH', `/vaults/${vaultId}/items/${itemId}`, body);
  }

  deleteItem(vaultId: string, itemId: string) {
    return this.req<ApiResponse<{ id: string }>>('DELETE', `/vaults/${vaultId}/items/${itemId}`);
  }

  upsertItems(vaultId: string, items: unknown[], idempotencyKey?: string) {
    return this.req<ApiResponse<UpsertResult>>('POST', `/vaults/${vaultId}/items/upsert`, {
      items,
      ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
    });
  }

  previewImport(vaultId: string, items: unknown[]) {
    return this.req<ApiResponse<PreviewResult>>('POST', `/vaults/${vaultId}/items/import-preview`, { items });
  }

  searchItems(vaultId: string, params: { q?: string; author?: string; year?: number; doi?: string; tag_id?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params.q) q.set('q', params.q);
    if (params.author) q.set('author', params.author);
    if (params.year !== undefined) q.set('year', String(params.year));
    if (params.doi) q.set('doi', params.doi);
    if (params.tag_id) q.set('tag_id', params.tag_id);
    if (params.page !== undefined) q.set('page', String(params.page));
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    return this.req<ApiResponse<Item[]>>('GET', `/vaults/${vaultId}/search?${q}`);
  }

  getStats(vaultId: string) {
    return this.req<ApiResponse<VaultStats>>('GET', `/vaults/${vaultId}/stats`);
  }

  getChanges(vaultId: string, since: string) {
    return this.req<ApiResponse<Item[]>>('GET', `/vaults/${vaultId}/changes?since=${encodeURIComponent(since)}`);
  }

  // ── Tags ─────────────────────────────────────────────────────────────────────

  listTags(vaultId: string) {
    return this.req<ApiResponse<Tag[]>>('GET', `/vaults/${vaultId}/tags`);
  }

  createTag(vaultId: string, body: { name: string; color?: string; parent_id?: string }) {
    return this.req<ApiResponse<Tag>>('POST', `/vaults/${vaultId}/tags`, body);
  }

  updateTag(vaultId: string, tagId: string, body: { name?: string; color?: string; parent_id?: string }) {
    return this.req<ApiResponse<Tag>>('PATCH', `/vaults/${vaultId}/tags/${tagId}`, body);
  }

  deleteTag(vaultId: string, tagId: string) {
    return this.req<ApiResponse<{ id: string }>>('DELETE', `/vaults/${vaultId}/tags/${tagId}`);
  }

  attachTags(vaultId: string, itemId: string, tagIds: string[]) {
    return this.req<ApiResponse<{ item_id: string; tag_ids: string[] }>>('POST', `/vaults/${vaultId}/tags/attach`, { item_id: itemId, tag_ids: tagIds });
  }

  detachTags(vaultId: string, itemId: string, tagIds: string[]) {
    return this.req<ApiResponse<{ item_id: string; tag_ids: string[] }>>('POST', `/vaults/${vaultId}/tags/detach`, { item_id: itemId, tag_ids: tagIds });
  }

  // ── Relations ────────────────────────────────────────────────────────────────

  listRelations(vaultId: string, type?: string) {
    const qs = type ? `?type=${type}` : '';
    return this.req<ApiResponse<Relation[]>>('GET', `/vaults/${vaultId}/relations${qs}`);
  }

  createRelation(vaultId: string, body: { publication_id: string; related_publication_id: string; relation_type?: string }) {
    return this.req<ApiResponse<Relation>>('POST', `/vaults/${vaultId}/relations`, body);
  }

  updateRelation(vaultId: string, relationId: string, body: { relation_type: string }) {
    return this.req<ApiResponse<Relation>>('PATCH', `/vaults/${vaultId}/relations/${relationId}`, body);
  }

  deleteRelation(vaultId: string, relationId: string) {
    return this.req<ApiResponse<{ id: string }>>('DELETE', `/vaults/${vaultId}/relations/${relationId}`);
  }

  // ── Import ───────────────────────────────────────────────────────────────────

  importDoi(vaultId: string, doi: string, tagIds: string[] = []) {
    return this.req<ApiResponse<{ item: Item }>>('POST', `/vaults/${vaultId}/import/doi`, { doi, tag_ids: tagIds });
  }

  importBibtex(vaultId: string, bibtex: string, tagIds: string[] = []) {
    return this.req<ApiResponse<BibTeXImportResult>>('POST', `/vaults/${vaultId}/import/bibtex`, { bibtex, tag_ids: tagIds });
  }

  importUrl(vaultId: string, url: string, tagIds: string[] = []) {
    return this.req<ApiResponse<{ item: Item }>>('POST', `/vaults/${vaultId}/import/url`, { url, tag_ids: tagIds });
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  exportVault(vaultId: string, format: 'json' | 'bibtex' = 'json') {
    return this.reqText('GET', `/vaults/${vaultId}/export?format=${format}`);
  }

  // ── Audit ────────────────────────────────────────────────────────────────────

  getAudit(vaultId: string, params: { since?: string; until?: string; limit?: number; page?: number } = {}) {
    const q = new URLSearchParams();
    if (params.since) q.set('since', params.since);
    if (params.until) q.set('until', params.until);
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    if (params.page !== undefined) q.set('page', String(params.page));
    const qs = q.toString() ? `?${q}` : '';
    return this.req<ApiResponse<AuditEntry[]>>('GET', `/vaults/${vaultId}/audit${qs}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function resolveClient(apiKey?: string): RefHubClient {
  const key = apiKey ?? process.env['REFHUB_API_KEY'];
  if (!key) {
    process.stderr.write(
      JSON.stringify({ error: { code: 'missing_api_key', message: 'No API key found. Set REFHUB_API_KEY or pass --api-key.' } }) + '\n',
    );
    process.exit(3);
  }
  return new RefHubClient(key);
}

export async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof RefHubError) {
      process.stderr.write(
        JSON.stringify({ error: { code: err.code, message: err.message, request_id: err.request_id } }) + '\n',
      );
      process.exit(err.status === 401 ? 3 : 1);
    }
    process.stderr.write(
      JSON.stringify({ error: { code: 'unexpected_error', message: String(err) } }) + '\n',
    );
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all client and resolveClient tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/client.ts src/types.ts tests/client.test.ts
git commit -m "feat: RefHubClient with all API methods, RefHubError, resolveClient, run"
```

---

### Task 4: Format module

**Files:**
- Create: `src/format.ts`
- Create: `tests/format.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/format.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { format } from '../src/format.js';

describe('format', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes JSON to stdout in JSON mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [{ id: '1', name: 'Test' }] }, false);
    const raw = String(spy.mock.calls[0]?.[0]);
    const parsed = JSON.parse(raw);
    expect(parsed.data[0].id).toBe('1');
  });

  it('JSON mode output ends with newline', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [] }, false);
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/\n$/);
  });

  it('falls back to JSON when data is not an array in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: { id: '1' } }, true);
    const raw = String(spy.mock.calls[0]?.[0]);
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('falls back to JSON when array is empty in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [] }, true, ['id', 'name']);
    const raw = String(spy.mock.calls[0]?.[0]);
    const parsed = JSON.parse(raw);
    expect(parsed.data).toEqual([]);
  });

  it('renders table with specified columns in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [{ id: 'v1', name: 'Vault A', visibility: 'private', extra: 'ignored' }] }, true, ['id', 'name', 'visibility']);
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).toContain('id');
    expect(output).toContain('name');
    expect(output).toContain('Vault A');
    expect(output).not.toContain('extra');
  });

  it('uses all object keys as columns when columns not specified in table mode', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    format({ data: [{ id: 'v1', name: 'Vault A' }] }, true);
    const output = String(spy.mock.calls[0]?.[0]);
    expect(output).toContain('id');
    expect(output).toContain('Vault A');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — `format` not found.

- [ ] **Step 3: Write src/format.ts**

```typescript
// src/format.ts
import Table from 'cli-table3';
import chalk from 'chalk';

export function format(response: unknown, tableMode: boolean, columns?: string[]): void {
  if (!tableMode) {
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
    return;
  }

  const data = (response as { data?: unknown })?.data;

  if (!Array.isArray(data) || data.length === 0) {
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
    return;
  }

  const cols = columns ?? Object.keys(data[0] as Record<string, unknown>);
  const table = new Table({
    head: cols.map((c) => chalk.cyan(c)),
  });

  for (const row of data) {
    table.push(cols.map((c) => String((row as Record<string, unknown>)[c] ?? '')));
  }

  process.stdout.write(table.toString() + '\n');
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all format tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/format.ts tests/format.test.ts
git commit -m "feat: format() — JSON default, cli-table3 for --table mode"
```

---

### Task 5: Root command

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Rewrite src/index.ts with full Commander setup**

```typescript
#!/usr/bin/env node
// src/index.ts
import { Command } from 'commander';
import { registerVaults } from './commands/vaults.js';
import { registerItems } from './commands/items.js';
import { registerTags } from './commands/tags.js';
import { registerRelations } from './commands/relations.js';
import { registerImport } from './commands/import.js';
import { registerExport } from './commands/export.js';
import { registerAudit } from './commands/audit.js';

const program = new Command();

program
  .name('refhub')
  .description('RefHub CLI — manage vaults, items, tags, and relations')
  .version('0.1.0')
  .option('--api-key <key>', 'RefHub API key (overrides REFHUB_API_KEY env var)')
  .option('--table', 'human-readable table output (default: JSON)');

registerVaults(program);
registerItems(program);
registerTags(program);
registerRelations(program);
registerImport(program);
registerExport(program);
registerAudit(program);

program.parseAsync();
```

Note: This file imports from command modules that don't exist yet. It will not compile until Tasks 6–12 are complete. During this task, keep the stub imports commented out and verify compilation with the final version after Task 12.

- [ ] **Step 2: Temporarily stub command imports so tsc passes**

Replace `src/index.ts` imports with empty stubs temporarily:

```typescript
#!/usr/bin/env node
// src/index.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('refhub')
  .description('RefHub CLI — manage vaults, items, tags, and relations')
  .version('0.1.0')
  .option('--api-key <key>', 'RefHub API key (overrides REFHUB_API_KEY env var)')
  .option('--table', 'human-readable table output (default: JSON)');

// Command groups registered after Tasks 6-12

program.parseAsync();
```

```bash
npm run build
```

Expected: compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: root Commander program with --api-key and --table global options"
```

---

### Task 6: Vaults commands

**Files:**
- Create: `src/commands/vaults.ts`
- Create: `tests/vaults.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — handlers not found.

- [ ] **Step 3: Write src/commands/vaults.ts**

```typescript
// src/commands/vaults.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleVaultsList(client: RefHubClient, tableMode: boolean): Promise<void> {
  const result = await client.listVaults();
  format(result, tableMode, ['id', 'name', 'visibility', 'item_count', 'updated_at']);
}

export async function handleVaultGet(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void> {
  const result = await client.getVault(vaultId);
  format(result, tableMode);
}

export async function handleVaultCreate(
  client: RefHubClient,
  opts: { name: string; description?: string; color?: string; visibility?: string; category?: string },
  tableMode: boolean,
): Promise<void> {
  const body: Record<string, unknown> = { name: opts.name };
  if (opts.description) body['description'] = opts.description;
  if (opts.color) body['color'] = opts.color;
  if (opts.visibility) body['visibility'] = opts.visibility;
  if (opts.category) body['category'] = opts.category;
  const result = await client.createVault(body as Parameters<RefHubClient['createVault']>[0]);
  format(result, tableMode);
}

export async function handleVaultUpdate(
  client: RefHubClient,
  vaultId: string,
  opts: { name?: string; description?: string; color?: string; category?: string },
  tableMode: boolean,
): Promise<void> {
  const result = await client.updateVault(vaultId, opts);
  format(result, tableMode);
}

export async function handleVaultDelete(
  client: RefHubClient,
  vaultId: string,
  confirmed: boolean,
): Promise<void> {
  if (!confirmed) {
    process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge this is a hard delete with no undo.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.deleteVault(vaultId);
  format(result, false);
}

export async function handleVaultVisibility(
  client: RefHubClient,
  vaultId: string,
  opts: { visibility: string; slug?: string },
  tableMode: boolean,
): Promise<void> {
  const body: { visibility: string; public_slug?: string } = { visibility: opts.visibility };
  if (opts.slug) body.public_slug = opts.slug;
  const result = await client.setVaultVisibility(vaultId, body);
  format(result, tableMode);
}

export async function handleSharesList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void> {
  const result = await client.listShares(vaultId);
  format(result, tableMode, ['id', 'email', 'role', 'name']);
}

export async function handleShareAdd(
  client: RefHubClient,
  vaultId: string,
  opts: { email: string; role: 'viewer' | 'editor'; name?: string },
  tableMode: boolean,
): Promise<void> {
  const result = await client.addShare(vaultId, opts);
  format(result, tableMode);
}

export async function handleShareUpdate(
  client: RefHubClient,
  vaultId: string,
  shareId: string,
  role: 'viewer' | 'editor',
  tableMode: boolean,
): Promise<void> {
  const result = await client.updateShare(vaultId, shareId, { role });
  format(result, tableMode);
}

export async function handleShareRemove(
  client: RefHubClient,
  vaultId: string,
  shareId: string,
): Promise<void> {
  const result = await client.removeShare(vaultId, shareId);
  format(result, false);
}

export function registerVaults(program: Command): void {
  const vaults = program.command('vaults').description('Manage vaults');

  vaults
    .command('list')
    .description('List all accessible vaults')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleVaultsList(client, g.table ?? false));
    });

  vaults
    .command('get')
    .argument('<vaultId>')
    .description('Read one vault with full contents')
    .action(async (vaultId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleVaultGet(client, vaultId, g.table ?? false));
    });

  vaults
    .command('create')
    .description('Create a vault')
    .requiredOption('--name <name>', 'vault name')
    .option('--description <desc>')
    .option('--color <color>')
    .option('--visibility <visibility>', 'private|protected|public')
    .option('--category <category>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleVaultCreate(client, opts as { name: string; description?: string; color?: string; visibility?: string; category?: string }, g.table ?? false));
    });

  vaults
    .command('update')
    .argument('<vaultId>')
    .description('Update vault metadata')
    .option('--name <name>')
    .option('--description <desc>')
    .option('--color <color>')
    .option('--category <category>')
    .action(async (vaultId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleVaultUpdate(client, vaultId, opts as { name?: string; description?: string; color?: string; category?: string }, g.table ?? false));
    });

  vaults
    .command('delete')
    .argument('<vaultId>')
    .description('Delete a vault (hard delete, no undo)')
    .option('--confirm', 'required: acknowledge this is a permanent deletion')
    .action(async (vaultId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleVaultDelete(client, vaultId, opts.confirm ?? false));
    });

  vaults
    .command('visibility')
    .argument('<vaultId>')
    .description('Set vault visibility')
    .requiredOption('--visibility <visibility>', 'private|protected|public')
    .option('--slug <slug>', 'public_slug for public vaults')
    .action(async (vaultId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleVaultVisibility(client, vaultId, { visibility: opts.visibility, slug: opts.slug }, g.table ?? false));
    });

  const shares = vaults.command('shares').description('Manage vault collaborators');

  shares
    .command('list')
    .argument('<vaultId>')
    .description('List vault collaborators')
    .action(async (vaultId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleSharesList(client, vaultId, g.table ?? false));
    });

  shares
    .command('add')
    .argument('<vaultId>')
    .description('Add a collaborator')
    .requiredOption('--email <email>')
    .requiredOption('--role <role>', 'viewer|editor')
    .option('--name <name>')
    .action(async (vaultId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleShareAdd(client, vaultId, { email: opts.email, role: opts.role, name: opts.name }, g.table ?? false));
    });

  shares
    .command('update')
    .argument('<vaultId>')
    .argument('<shareId>')
    .description('Update a collaborator role')
    .requiredOption('--role <role>', 'viewer|editor')
    .action(async (vaultId, shareId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleShareUpdate(client, vaultId, shareId, opts.role, g.table ?? false));
    });

  shares
    .command('remove')
    .argument('<vaultId>')
    .argument('<shareId>')
    .description('Remove a collaborator')
    .action(async (vaultId, shareId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleShareRemove(client, vaultId, shareId));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all vault tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/vaults.ts tests/vaults.test.ts
git commit -m "feat: vaults commands — list, get, create, update, delete, visibility, shares CRUD"
```

---

### Task 7: Items commands

**Files:**
- Create: `src/commands/items.ts`
- Create: `tests/items.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — item handlers not found.

- [ ] **Step 3: Write src/commands/items.ts**

```typescript
// src/commands/items.ts
import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleItemsList(
  client: RefHubClient,
  vaultId: string,
  opts: { page?: number; limit?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.listItems(vaultId, opts);
  format(result, tableMode, ['id', 'title', 'authors', 'year', 'doi', 'updated_at']);
}

export async function handleItemGet(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.getItem(vaultId, itemId);
  format(result, tableMode);
}

export async function handleItemAdd(
  client: RefHubClient,
  vaultId: string,
  opts: { title: string; authors?: string; year?: number; doi?: string; tags?: string },
  tableMode: boolean,
): Promise<void> {
  const item: Record<string, unknown> = { title: opts.title };
  if (opts.authors) item['authors'] = opts.authors;
  if (opts.year !== undefined) item['year'] = opts.year;
  if (opts.doi) item['doi'] = opts.doi;
  if (opts.tags) item['tag_ids'] = opts.tags.split(',').map((t) => t.trim());
  const result = await client.addItems(vaultId, [item as { title: string }]);
  format(result, tableMode, ['id', 'title', 'doi', 'year']);
}

export async function handleItemUpdate(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  opts: { title?: string; authors?: string; year?: number; doi?: string; tags?: string },
  tableMode: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (opts.title) body['title'] = opts.title;
  if (opts.authors) body['authors'] = opts.authors;
  if (opts.year !== undefined) body['year'] = opts.year;
  if (opts.doi) body['doi'] = opts.doi;
  if (opts.tags) {
    process.stderr.write(
      JSON.stringify({ warning: 'tag_replacement', message: '--tags replaces the full tag set, not an append. Existing tags will be removed.' }) + '\n',
    );
    body['tag_ids'] = opts.tags.split(',').map((t) => t.trim());
  }
  const result = await client.updateItem(vaultId, itemId, body as Parameters<RefHubClient['updateItem']>[2]);
  format(result, tableMode);
}

export async function handleItemDelete(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  confirmed: boolean,
): Promise<void> {
  if (!confirmed) {
    process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge this is a hard delete with no undo.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.deleteItem(vaultId, itemId);
  format(result, false);
}

export async function handleItemUpsert(
  client: RefHubClient,
  vaultId: string,
  filePath: string,
  idempotencyKey: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const items = JSON.parse(readFileSync(filePath, 'utf8')) as unknown[];
  if (!Array.isArray(items)) {
    process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of items.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.upsertItems(vaultId, items, idempotencyKey);
  format(result, tableMode);
}

export async function handleItemPreview(
  client: RefHubClient,
  vaultId: string,
  filePath: string,
  tableMode: boolean,
): Promise<void> {
  const items = JSON.parse(readFileSync(filePath, 'utf8')) as unknown[];
  if (!Array.isArray(items)) {
    process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of items.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.previewImport(vaultId, items);
  format(result, tableMode);
}

export async function handleItemSearch(
  client: RefHubClient,
  vaultId: string,
  opts: { q?: string; author?: string; year?: number; doi?: string; tag?: string; page?: number; limit?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.searchItems(vaultId, {
    q: opts.q,
    author: opts.author,
    year: opts.year,
    doi: opts.doi,
    tag_id: opts.tag,
    page: opts.page,
    limit: opts.limit,
  });
  format(result, tableMode, ['id', 'title', 'authors', 'year', 'doi']);
}

export async function handleItemStats(
  client: RefHubClient,
  vaultId: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.getStats(vaultId);
  format(result, tableMode);
}

export async function handleItemChanges(
  client: RefHubClient,
  vaultId: string,
  since: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.getChanges(vaultId, since);
  format(result, tableMode, ['id', 'title', 'updated_at']);
}

export function registerItems(program: Command): void {
  const items = program.command('items').description('Manage vault items');

  items
    .command('list')
    .description('List items in a vault')
    .requiredOption('--vault <id>')
    .option('--page <n>', 'page number', (v) => parseInt(v, 10))
    .option('--limit <n>', 'results per page', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemsList(client, opts.vault, { page: opts.page, limit: opts.limit }, g.table ?? false));
    });

  items
    .command('get')
    .argument('<itemId>')
    .description('Get a single item')
    .requiredOption('--vault <id>')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemGet(client, opts.vault, itemId, g.table ?? false));
    });

  items
    .command('add')
    .description('Add an item to a vault')
    .requiredOption('--vault <id>')
    .requiredOption('--title <title>')
    .option('--authors <authors>', 'comma-separated, e.g. "Smith J,Doe A"')
    .option('--year <year>', 'publication year', (v) => parseInt(v, 10))
    .option('--doi <doi>')
    .option('--tags <ids>', 'comma-separated tag IDs')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemAdd(client, opts.vault, { title: opts.title, authors: opts.authors, year: opts.year, doi: opts.doi, tags: opts.tags }, g.table ?? false));
    });

  items
    .command('update')
    .argument('<itemId>')
    .description('Update an item')
    .requiredOption('--vault <id>')
    .option('--title <title>')
    .option('--authors <authors>')
    .option('--year <year>', '', (v) => parseInt(v, 10))
    .option('--doi <doi>')
    .option('--tags <ids>', 'comma-separated tag IDs — REPLACES the full tag set')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemUpdate(client, opts.vault, itemId, { title: opts.title, authors: opts.authors, year: opts.year, doi: opts.doi, tags: opts.tags }, g.table ?? false));
    });

  items
    .command('delete')
    .argument('<itemId>')
    .description('Delete an item (hard delete, no undo)')
    .requiredOption('--vault <id>')
    .option('--confirm', 'required: acknowledge permanent deletion')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemDelete(client, opts.vault, itemId, opts.confirm ?? false));
    });

  items
    .command('upsert')
    .description('Bulk upsert items from a JSON file')
    .requiredOption('--vault <id>')
    .requiredOption('--file <path>', 'path to JSON file containing array of items')
    .option('--idempotency-key <key>', 'safe retry key')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemUpsert(client, opts.vault, opts.file, opts.idempotencyKey, g.table ?? false));
    });

  items
    .command('preview')
    .description('Dry-run upsert — shows what would change without writing')
    .requiredOption('--vault <id>')
    .requiredOption('--file <path>', 'path to JSON file containing array of items')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemPreview(client, opts.vault, opts.file, g.table ?? false));
    });

  items
    .command('search')
    .description('Search items in a vault')
    .requiredOption('--vault <id>')
    .option('--q <query>', 'full-text search')
    .option('--author <author>')
    .option('--year <year>', '', (v) => parseInt(v, 10))
    .option('--doi <doi>')
    .option('--tag <tagId>')
    .option('--page <n>', '', (v) => parseInt(v, 10))
    .option('--limit <n>', '', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemSearch(client, opts.vault, { q: opts.q, author: opts.author, year: opts.year, doi: opts.doi, tag: opts.tag, page: opts.page, limit: opts.limit }, g.table ?? false));
    });

  items
    .command('stats')
    .description('Get vault statistics')
    .requiredOption('--vault <id>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemStats(client, opts.vault, g.table ?? false));
    });

  items
    .command('changes')
    .description('Get items changed since a timestamp')
    .requiredOption('--vault <id>')
    .requiredOption('--since <ISO>', 'ISO 8601 timestamp')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemChanges(client, opts.vault, opts.since, g.table ?? false));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all item tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/items.ts tests/items.test.ts
git commit -m "feat: items commands — list, get, add, update, delete, upsert, preview, search, stats, changes"
```

---

### Task 8: Tags commands

**Files:**
- Create: `src/commands/tags.ts`
- Create: `tests/tags.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — tag handlers not found.

- [ ] **Step 3: Write src/commands/tags.ts**

```typescript
// src/commands/tags.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleTagsList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void> {
  const result = await client.listTags(vaultId);
  format(result, tableMode, ['id', 'name', 'color', 'parent_id']);
}

export async function handleTagCreate(
  client: RefHubClient,
  vaultId: string,
  opts: { name: string; color?: string; parent?: string },
  tableMode: boolean,
): Promise<void> {
  const body: { name: string; color?: string; parent_id?: string } = { name: opts.name };
  if (opts.color) body.color = opts.color;
  if (opts.parent) body.parent_id = opts.parent;
  const result = await client.createTag(vaultId, body);
  format(result, tableMode);
}

export async function handleTagUpdate(
  client: RefHubClient,
  vaultId: string,
  tagId: string,
  opts: { name?: string; color?: string; parent?: string },
  tableMode: boolean,
): Promise<void> {
  const body: { name?: string; color?: string; parent_id?: string } = {};
  if (opts.name) body.name = opts.name;
  if (opts.color) body.color = opts.color;
  if (opts.parent) body.parent_id = opts.parent;
  const result = await client.updateTag(vaultId, tagId, body);
  format(result, tableMode);
}

export async function handleTagDelete(client: RefHubClient, vaultId: string, tagId: string): Promise<void> {
  const result = await client.deleteTag(vaultId, tagId);
  format(result, false);
}

export async function handleTagAttach(client: RefHubClient, vaultId: string, itemId: string, tagsCsv: string): Promise<void> {
  const tagIds = tagsCsv.split(',').map((t) => t.trim());
  const result = await client.attachTags(vaultId, itemId, tagIds);
  format(result, false);
}

export async function handleTagDetach(client: RefHubClient, vaultId: string, itemId: string, tagsCsv: string): Promise<void> {
  const tagIds = tagsCsv.split(',').map((t) => t.trim());
  const result = await client.detachTags(vaultId, itemId, tagIds);
  format(result, false);
}

export function registerTags(program: Command): void {
  const tags = program.command('tags').description('Manage vault tags');

  tags
    .command('list')
    .description('List tags in a vault')
    .requiredOption('--vault <id>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagsList(client, opts.vault, g.table ?? false));
    });

  tags
    .command('create')
    .description('Create a tag')
    .requiredOption('--vault <id>')
    .requiredOption('--name <name>')
    .option('--color <color>')
    .option('--parent <tagId>', 'parent tag ID')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagCreate(client, opts.vault, { name: opts.name, color: opts.color, parent: opts.parent }, g.table ?? false));
    });

  tags
    .command('update')
    .argument('<tagId>')
    .description('Update a tag')
    .requiredOption('--vault <id>')
    .option('--name <name>')
    .option('--color <color>')
    .option('--parent <tagId>')
    .action(async (tagId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagUpdate(client, opts.vault, tagId, { name: opts.name, color: opts.color, parent: opts.parent }, g.table ?? false));
    });

  tags
    .command('delete')
    .argument('<tagId>')
    .description('Delete a tag')
    .requiredOption('--vault <id>')
    .action(async (tagId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagDelete(client, opts.vault, tagId));
    });

  tags
    .command('attach')
    .description('Attach tags to an item (idempotent)')
    .requiredOption('--vault <id>')
    .requiredOption('--item <itemId>')
    .requiredOption('--tags <ids>', 'comma-separated tag IDs')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagAttach(client, opts.vault, opts.item, opts.tags));
    });

  tags
    .command('detach')
    .description('Detach tags from an item')
    .requiredOption('--vault <id>')
    .requiredOption('--item <itemId>')
    .requiredOption('--tags <ids>', 'comma-separated tag IDs')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagDetach(client, opts.vault, opts.item, opts.tags));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all tag tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/tags.ts tests/tags.test.ts
git commit -m "feat: tags commands — list, create, update, delete, attach, detach"
```

---

### Task 9: Relations commands

**Files:**
- Create: `src/commands/relations.ts`
- Create: `tests/relations.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/relations.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — relation handlers not found.

- [ ] **Step 3: Write src/commands/relations.ts**

```typescript
// src/commands/relations.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

const RELATION_TYPES = 'cites|extends|builds_on|contradicts|reviews|related';

export async function handleRelationsList(
  client: RefHubClient,
  vaultId: string,
  type: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.listRelations(vaultId, type);
  format(result, tableMode, ['id', 'publication_id', 'related_publication_id', 'relation_type']);
}

export async function handleRelationCreate(
  client: RefHubClient,
  vaultId: string,
  opts: { pub: string; related: string; type?: string },
  tableMode: boolean,
): Promise<void> {
  const result = await client.createRelation(vaultId, {
    publication_id: opts.pub,
    related_publication_id: opts.related,
    relation_type: opts.type,
  });
  format(result, tableMode);
}

export async function handleRelationUpdate(
  client: RefHubClient,
  vaultId: string,
  relationId: string,
  type: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.updateRelation(vaultId, relationId, { relation_type: type });
  format(result, tableMode);
}

export async function handleRelationDelete(
  client: RefHubClient,
  vaultId: string,
  relationId: string,
): Promise<void> {
  const result = await client.deleteRelation(vaultId, relationId);
  format(result, false);
}

export function registerRelations(program: Command): void {
  const relations = program.command('relations').description('Manage vault relations');

  relations
    .command('list')
    .description('List relations in a vault')
    .requiredOption('--vault <id>')
    .option('--type <type>', RELATION_TYPES)
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationsList(client, opts.vault, opts.type, g.table ?? false));
    });

  relations
    .command('create')
    .description('Create a relation between two publications')
    .requiredOption('--vault <id>')
    .requiredOption('--pub <publicationId>')
    .requiredOption('--related <publicationId>')
    .option('--type <type>', RELATION_TYPES)
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationCreate(client, opts.vault, { pub: opts.pub, related: opts.related, type: opts.type }, g.table ?? false));
    });

  relations
    .command('update')
    .argument('<relationId>')
    .description('Update a relation type')
    .requiredOption('--vault <id>')
    .requiredOption('--type <type>', RELATION_TYPES)
    .action(async (relationId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationUpdate(client, opts.vault, relationId, opts.type, g.table ?? false));
    });

  relations
    .command('delete')
    .argument('<relationId>')
    .description('Delete a relation')
    .requiredOption('--vault <id>')
    .action(async (relationId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationDelete(client, opts.vault, relationId));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all relation tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/relations.ts tests/relations.test.ts
git commit -m "feat: relations commands — list, create, update, delete"
```

---

### Task 10: Import commands

**Files:**
- Create: `src/commands/import.ts`
- Create: `tests/import.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/import.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RefHubClient } from '../src/client.js';
import {
  handleImportDoi,
  handleImportBibtex,
  handleImportUrl,
} from '../src/commands/import.js';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }));
}

describe('import commands', () => {
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

  it('handleImportDoi sends doi in body', async () => {
    mockFetch({ data: { item: { id: 'i1', title: 'Paper' } } });
    await handleImportDoi(client, 'v1', '10.1234/test', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.doi).toBe('10.1234/test');
    expect(body.tag_ids).toEqual([]);
  });

  it('handleImportDoi parses --tags into tag_ids array', async () => {
    mockFetch({ data: { item: { id: 'i1' } } });
    await handleImportDoi(client, 'v1', '10.1234/test', 't1,t2', false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.tag_ids).toEqual(['t1', 't2']);
  });

  it('handleImportBibtex sends bibtex string', async () => {
    mockFetch({ data: { created: [], skipped: [] } });
    await handleImportBibtex(client, 'v1', '@article{key, title={T}}', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.bibtex).toContain('@article');
  });

  it('handleImportUrl sends url in body', async () => {
    mockFetch({ data: { item: { id: 'i1' } } });
    await handleImportUrl(client, 'v1', 'https://arxiv.org/abs/2301.00001', undefined, false);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.url).toBe('https://arxiv.org/abs/2301.00001');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — import handlers not found.

- [ ] **Step 3: Write src/commands/import.ts**

```typescript
// src/commands/import.ts
import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

function parseTags(tagsCsv?: string): string[] {
  if (!tagsCsv) return [];
  return tagsCsv.split(',').map((t) => t.trim());
}

export async function handleImportDoi(
  client: RefHubClient,
  vaultId: string,
  doi: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.importDoi(vaultId, doi, parseTags(tagsCsv));
  format(result, tableMode);
}

export async function handleImportBibtex(
  client: RefHubClient,
  vaultId: string,
  bibtexOrPath: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.importBibtex(vaultId, bibtexOrPath, parseTags(tagsCsv));
  format(result, tableMode);
}

export async function handleImportUrl(
  client: RefHubClient,
  vaultId: string,
  url: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.importUrl(vaultId, url, parseTags(tagsCsv));
  format(result, tableMode);
}

export function registerImport(program: Command): void {
  const imp = program.command('import').description('Import references into a vault');

  imp
    .command('doi')
    .description('Import a reference by DOI')
    .requiredOption('--vault <id>')
    .requiredOption('--doi <doi>')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleImportDoi(client, opts.vault, opts.doi, opts.tags, g.table ?? false));
    });

  imp
    .command('bibtex')
    .description('Import references from a BibTeX string or file')
    .requiredOption('--vault <id>')
    .option('--bibtex <string>', 'inline BibTeX string')
    .option('--file <path>', 'path to .bib file')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      if (!opts.bibtex && !opts.file) {
        process.stderr.write(JSON.stringify({ error: { code: 'missing_input', message: 'Provide --bibtex <string> or --file <path>.' } }) + '\n');
        process.exit(2);
      }
      const bibtex: string = opts.file ? readFileSync(opts.file, 'utf8') : opts.bibtex;
      const client = resolveClient(g.apiKey);
      await run(() => handleImportBibtex(client, opts.vault, bibtex, opts.tags, g.table ?? false));
    });

  imp
    .command('url')
    .description('Import a reference from a URL (Open Graph scrape)')
    .requiredOption('--vault <id>')
    .requiredOption('--url <url>')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleImportUrl(client, opts.vault, opts.url, opts.tags, g.table ?? false));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all import tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/import.ts tests/import.test.ts
git commit -m "feat: import commands — doi, bibtex (inline or file), url"
```

---

### Task 11: Export command

**Files:**
- Create: `src/commands/export.ts`
- Create: `tests/export.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — `handleExport` not found.

- [ ] **Step 3: Write src/commands/export.ts**

```typescript
// src/commands/export.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';

export async function handleExport(
  client: RefHubClient,
  vaultId: string,
  outputFormat: 'json' | 'bibtex',
): Promise<void> {
  const raw = await client.exportVault(vaultId, outputFormat);
  process.stdout.write(raw + '\n');
}

export function registerExport(program: Command): void {
  program
    .command('export')
    .description('Export a vault as JSON or BibTeX')
    .requiredOption('--vault <id>')
    .option('--format <format>', 'json|bibtex', 'json')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      const fmt = opts.format === 'bibtex' ? 'bibtex' : 'json';
      await run(() => handleExport(client, opts.vault, fmt));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all export tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/commands/export.ts tests/export.test.ts
git commit -m "feat: export command — json and bibtex formats, raw stdout"
```

---

### Task 12: Audit command

**Files:**
- Create: `src/commands/audit.ts`
- Create: `tests/audit.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failures — `handleAudit` not found.

- [ ] **Step 3: Write src/commands/audit.ts**

```typescript
// src/commands/audit.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleAudit(
  client: RefHubClient,
  vaultId: string,
  opts: { since?: string; until?: string; limit?: number; page?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.getAudit(vaultId, opts);
  format(result, tableMode, ['id', 'action', 'entity_type', 'entity_id', 'created_at']);
}

export function registerAudit(program: Command): void {
  program
    .command('audit')
    .description('Read vault audit log')
    .requiredOption('--vault <id>')
    .option('--since <ISO>', 'start timestamp (ISO 8601)')
    .option('--until <ISO>', 'end timestamp (ISO 8601)')
    .option('--limit <n>', 'results per page (max 200)', (v) => parseInt(v, 10))
    .option('--page <n>', 'page number', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleAudit(client, opts.vault, { since: opts.since, until: opts.until, limit: opts.limit, page: opts.page }, g.table ?? false));
    });
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test
```

Expected: all audit tests pass.

- [ ] **Step 5: Wire all command groups into src/index.ts**

Replace the stub `src/index.ts` with the full version (all imports uncommented):

```typescript
#!/usr/bin/env node
// src/index.ts
import { Command } from 'commander';
import { registerVaults } from './commands/vaults.js';
import { registerItems } from './commands/items.js';
import { registerTags } from './commands/tags.js';
import { registerRelations } from './commands/relations.js';
import { registerImport } from './commands/import.js';
import { registerExport } from './commands/export.js';
import { registerAudit } from './commands/audit.js';

const program = new Command();

program
  .name('refhub')
  .description('RefHub CLI — manage vaults, items, tags, and relations')
  .version('0.1.0')
  .option('--api-key <key>', 'RefHub API key (overrides REFHUB_API_KEY env var)')
  .option('--table', 'human-readable table output (default: JSON)');

registerVaults(program);
registerItems(program);
registerTags(program);
registerRelations(program);
registerImport(program);
registerExport(program);
registerAudit(program);

program.parseAsync();
```

- [ ] **Step 6: Build and verify --help works**

```bash
npm run build
node dist/index.js --help
```

Expected output includes: `vaults`, `items`, `tags`, `relations`, `import`, `export`, `audit` command groups listed.

```bash
node dist/index.js vaults --help
node dist/index.js items --help
```

Expected: subcommands listed for each group.

- [ ] **Step 7: Run full test suite**

```bash
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Step 8: Commit**

```bash
git add src/commands/audit.ts tests/audit.test.ts src/index.ts
git commit -m "feat: audit command + wire all command groups into root program"
```

---

### Task 13: Smoke test

**Files:**
- Create: `scripts/smoke.ts`

- [ ] **Step 1: Write scripts/smoke.ts**

```typescript
// scripts/smoke.ts
// Live end-to-end smoke test. Requires REFHUB_API_KEY in environment.
// Run with: npm run smoke
// Cleans up after itself (deletes the test vault at the end).

import { RefHubClient } from '../src/client.js';

const key = process.env['REFHUB_API_KEY'];
if (!key) {
  console.error('REFHUB_API_KEY not set');
  process.exit(3);
}

const client = new RefHubClient(key);
let testVaultId = '';

async function step(name: string, fn: () => Promise<unknown>) {
  process.stdout.write(`\n[smoke] ${name}... `);
  try {
    const result = await fn();
    process.stdout.write('OK\n');
    return result;
  } catch (err) {
    process.stdout.write('FAILED\n');
    console.error(err);
    process.exit(1);
  }
}

async function main() {
  console.log('RefHub CLI Smoke Test');
  console.log('=====================');

  // 1. List vaults
  const vaults = await step('list vaults', () => client.listVaults()) as { data: Array<{ id: string; name: string }> };
  console.log(`   Found ${vaults.data.length} vault(s)`);

  // 2. Read first vault if available
  if (vaults.data.length > 0) {
    const firstVault = vaults.data[0];
    await step(`read vault "${firstVault.name}"`, () => client.getVault(firstVault.id));
  }

  // 3. Create test vault
  const created = await step('create test vault', () =>
    client.createVault({ name: `smoke-test-${Date.now()}`, description: 'CLI smoke test — safe to delete', visibility: 'private' })
  ) as { data: { id: string; name: string } };
  testVaultId = created.data.id;
  console.log(`   Created vault: ${created.data.id}`);

  // 4. Tag CRUD
  const tag = await step('create tag', () =>
    client.createTag(testVaultId, { name: 'smoke-tag', color: '#ff0000' })
  ) as { data: { id: string } };
  const tagId = tag.data.id;

  await step('list tags', () => client.listTags(testVaultId));
  await step('update tag', () => client.updateTag(testVaultId, tagId, { name: 'smoke-tag-updated' }));
  await step('delete tag', () => client.deleteTag(testVaultId, tagId));

  // 5. Add item
  const item = await step('add item', () =>
    client.addItems(testVaultId, [{ title: 'Smoke Test Paper', authors: 'Test Author', year: 2026 }])
  ) as { data: Array<{ id: string; publication_id: string }> };
  const itemId = item.data[0].id;
  const pubId = item.data[0].publication_id;
  console.log(`   Item id: ${itemId}, pub id: ${pubId}`);

  // 6. Relation CRUD
  const item2 = await step('add second item for relation', () =>
    client.addItems(testVaultId, [{ title: 'Related Smoke Paper', year: 2026 }])
  ) as { data: Array<{ id: string; publication_id: string }> };
  const pubId2 = item2.data[0].publication_id;

  const relation = await step('create relation', () =>
    client.createRelation(testVaultId, { publication_id: pubId, related_publication_id: pubId2, relation_type: 'cites' })
  ) as { data: { id: string } };
  const relationId = relation.data.id;

  await step('list relations', () => client.listRelations(testVaultId));
  await step('update relation', () => client.updateRelation(testVaultId, relationId, { relation_type: 'extends' }));
  await step('delete relation', () => client.deleteRelation(testVaultId, relationId));

  // 7. Export
  await step('export as JSON', () => client.exportVault(testVaultId, 'json'));
  await step('export as BibTeX', () => client.exportVault(testVaultId, 'bibtex'));

  // 8. Stats and audit
  await step('get stats', () => client.getStats(testVaultId));
  await step('get audit log', () => client.getAudit(testVaultId));

  // 9. Cleanup — delete test vault
  await step('delete test vault (cleanup)', () => client.deleteVault(testVaultId));

  console.log('\n✓ All smoke tests passed\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  if (testVaultId) {
    console.error(`WARNING: Test vault ${testVaultId} may not have been cleaned up.`);
  }
  process.exit(1);
});
```

- [ ] **Step 2: Add smoke script to package.json (already done in Task 1)**

Verify `package.json` has:
```json
"smoke": "tsx scripts/smoke.ts"
```

- [ ] **Step 3: Run smoke test against live API**

```bash
npm run smoke
```

Expected: each step prints `OK`, final line is `✓ All smoke tests passed`.

If a step fails, the error will be printed and the script exits 1. Note that if the test vault was created before failure, it may need manual deletion.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke.ts
git commit -m "feat: smoke test script — full live API sequence with cleanup"
```

---

### Task 14: Global install and skill integration

**Files:**
- Modify: `/home/velitchko/Documents/Projects/refhub/refhub-skill/SKILL.md`
- Create: `/opt/openclaw/.openclaw/workspace/skills/refhub-skill/SKILL.md` (path may need mkdir)

- [ ] **Step 1: Install CLI globally via npm link**

```bash
cd /home/velitchko/Documents/Projects/refhub/refhub-cli
npm run build
npm link
```

- [ ] **Step 2: Verify global install works**

```bash
refhub --help
refhub vaults --help
refhub items upsert --help
```

Expected: help text for each command prints cleanly.

- [ ] **Step 3: Update refhub-skill/SKILL.md — add execution layer section**

Open `/home/velitchko/Documents/Projects/refhub/refhub-skill/SKILL.md` and insert immediately after the opening frontmatter block (after the `---` closing the frontmatter):

```markdown
## Execution layer

If the `refhub` CLI is available in the environment (`which refhub` succeeds), use it instead of making HTTP calls directly. The CLI handles authentication, error formatting, and consistent output.

**Setup:** The CLI reads `REFHUB_API_KEY` from the environment. A `--api-key` flag overrides it for one-off calls.

**Command reference:** Run `refhub --help` or `refhub <group> --help` (e.g. `refhub vaults --help`) to see available commands and flags.

**Output:** JSON by default. Pass `--table` for human-readable tables.

**Exit codes:** `0` success · `1` API error · `2` bad arguments · `3` auth error (missing/invalid key)

All workflows documented below map directly to CLI commands. Agents in environments without the CLI may fall back to direct HTTP as documented in the workflow sections.
```

- [ ] **Step 4: Create OpenClaw workspace skill directory and SKILL.md**

Note: `/opt/openclaw` may not exist yet or may require sudo. If it doesn't exist, create it:

```bash
sudo mkdir -p /opt/openclaw/.openclaw/workspace/skills/refhub-skill
sudo chown -R $(whoami) /opt/openclaw
```

If the directory already exists without needing sudo:

```bash
mkdir -p /opt/openclaw/.openclaw/workspace/skills/refhub-skill
```

Then write `/opt/openclaw/.openclaw/workspace/skills/refhub-skill/SKILL.md`:

```markdown
---
name: refhub-skill
description: Use when an agent needs to read, write, organize, import, search, export, or audit content in RefHub vaults using the refhub CLI. Requires REFHUB_API_KEY in the environment.
---

# RefHub CLI Skill

Use the `refhub` CLI to operate RefHub vaults. The CLI is the execution layer for the RefHub API.

## Prerequisites

- `refhub` must be installed (`which refhub` succeeds)
- `REFHUB_API_KEY` must be set in the environment (or pass `--api-key` per call)

## Command groups

```
refhub vaults     — list, get, create, update, delete, visibility, shares
refhub items      — list, get, add, update, delete, upsert, preview, search, stats, changes
refhub tags       — list, create, update, delete, attach, detach
refhub relations  — list, create, update, delete
refhub import     — doi, bibtex, url
refhub export     — json or bibtex format
refhub audit      — vault-scoped audit log
```

## Usage

Run `refhub --help` or `refhub <group> --help` for full flag reference.

Output is JSON by default. Pass `--table` for human-readable output.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | API error (4xx/5xx) |
| `2` | Bad arguments |
| `3` | Auth error (missing or invalid key) |

## Behavioral rules and guardrails

See the full `refhub-skill` spec at the source repo for:
- Scope requirements per operation
- Delete confirmation requirements (`--confirm` flag)
- Tag replacement vs append behaviour on `items update`
- Idempotency key usage for bulk upsert
- Error codes and retry guidance
```

- [ ] **Step 5: Verify skill files look correct**

```bash
head -30 /home/velitchko/Documents/Projects/refhub/refhub-skill/SKILL.md
head -20 /opt/openclaw/.openclaw/workspace/skills/refhub-skill/SKILL.md
```

- [ ] **Step 6: Commit refhub-cli changes**

```bash
cd /home/velitchko/Documents/Projects/refhub/refhub-cli
git add .
git commit -m "feat: npm link instructions and plan complete"
```

- [ ] **Step 7: Commit refhub-skill changes**

```bash
cd /home/velitchko/Documents/Projects/refhub/refhub-skill
git add SKILL.md
git commit -m "feat: add execution layer section pointing to refhub CLI"
```
