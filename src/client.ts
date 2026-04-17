// src/client.ts
import type {
  ApiResponse, Vault, VaultDetail, Share,
  Item, UpsertResult, PreviewResult,
  Tag, Relation, BibTeXImportResult, AuditEntry, VaultStats, RelationType,
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
    const qs = q.toString() ? `?${q}` : '';
    return this.req<ApiResponse<Item[]>>('GET', `/vaults/${vaultId}/search${qs}`);
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
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.req<ApiResponse<Relation[]>>('GET', `/vaults/${vaultId}/relations${qs}`);
  }

  createRelation(vaultId: string, body: { publication_id: string; related_publication_id: string; relation_type?: RelationType }) {
    return this.req<ApiResponse<Relation>>('POST', `/vaults/${vaultId}/relations`, body);
  }

  updateRelation(vaultId: string, relationId: string, body: { relation_type: RelationType }) {
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
        JSON.stringify({
          error: {
            code: err.code,
            message: err.message,
            request_id: err.request_id,
            ...(err.retry_after_seconds !== undefined ? { retry_after_seconds: err.retry_after_seconds } : {}),
          },
        }) + '\n',
      );
      process.exit(err.status === 401 ? 3 : 1);
    }
    process.stderr.write(
      JSON.stringify({ error: { code: 'unexpected_error', message: String(err) } }) + '\n',
    );
    process.exit(1);
  }
}
