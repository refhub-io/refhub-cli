export class RefHubError extends Error {
    code;
    request_id;
    status;
    retry_after_seconds;
    constructor(status, code, message, request_id, retry_after_seconds) {
        super(message);
        this.name = 'RefHubError';
        this.status = status;
        this.code = code;
        this.request_id = request_id;
        this.retry_after_seconds = retry_after_seconds;
    }
}
export class RefHubClient {
    baseUrl = 'https://refhub-api.netlify.app/api/v1';
    headers;
    constructor(apiKey) {
        this.headers = {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        };
    }
    async req(method, path, body) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: this.headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            const err = (payload['error'] ?? {});
            throw new RefHubError(res.status, String(err['code'] ?? 'unknown_error'), String(err['message'] ?? `HTTP ${res.status}`), String(payload['meta']?.['request_id'] ?? err['request_id'] ?? ''), typeof err['details']?.['retry_after_seconds'] === 'number'
                ? Number(err['details']['retry_after_seconds'])
                : typeof payload['retry_after_seconds'] === 'number' ? payload['retry_after_seconds'] : undefined);
        }
        return res.json();
    }
    async reqBinary(method, path, body, contentType = 'application/octet-stream') {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: { ...this.headers, 'Content-Type': contentType },
            body: body,
        });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            const err = (payload['error'] ?? {});
            throw new RefHubError(res.status, String(err['code'] ?? 'unknown_error'), String(err['message'] ?? `HTTP ${res.status}`), String(payload['meta']?.['request_id'] ?? err['request_id'] ?? ''));
        }
        return res.json();
    }
    async reqText(method, path) {
        const res = await fetch(`${this.baseUrl}${path}`, { method, headers: this.headers });
        if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            const err = (payload['error'] ?? {});
            throw new RefHubError(res.status, String(err['code'] ?? 'unknown_error'), String(err['message'] ?? `HTTP ${res.status}`), String(payload['meta']?.['request_id'] ?? err['request_id'] ?? ''));
        }
        return res.text();
    }
    // ── Vaults ──────────────────────────────────────────────────────────────────
    listVaults() {
        return this.req('GET', '/vaults');
    }
    getVault(vaultId) {
        return this.req('GET', `/vaults/${vaultId}`);
    }
    createVault(body) {
        return this.req('POST', '/vaults', body);
    }
    updateVault(vaultId, body) {
        return this.req('PATCH', `/vaults/${vaultId}`, body);
    }
    deleteVault(vaultId) {
        return this.req('DELETE', `/vaults/${vaultId}`);
    }
    setVaultVisibility(vaultId, body) {
        return this.req('PATCH', `/vaults/${vaultId}/visibility`, body);
    }
    listShares(vaultId) {
        return this.req('GET', `/vaults/${vaultId}/shares`);
    }
    addShare(vaultId, body) {
        return this.req('POST', `/vaults/${vaultId}/shares`, body);
    }
    updateShare(vaultId, shareId, body) {
        return this.req('PATCH', `/vaults/${vaultId}/shares/${shareId}`, body);
    }
    removeShare(vaultId, shareId) {
        return this.req('DELETE', `/vaults/${vaultId}/shares/${shareId}`);
    }
    // ── Items ────────────────────────────────────────────────────────────────────
    listItems(vaultId, params = {}) {
        const q = new URLSearchParams();
        if (params.page !== undefined)
            q.set('page', String(params.page));
        if (params.limit !== undefined)
            q.set('per_page', String(params.limit));
        const qs = q.toString() ? `?${q}` : '';
        return this.req('GET', `/vaults/${vaultId}/items${qs}`);
    }
    getItem(vaultId, itemId) {
        return this.req('GET', `/vaults/${vaultId}/items/${itemId}`);
    }
    addItems(vaultId, items) {
        return this.req('POST', `/vaults/${vaultId}/items`, { items });
    }
    updateItem(vaultId, itemId, body) {
        return this.req('PATCH', `/vaults/${vaultId}/items/${itemId}`, body);
    }
    deleteItem(vaultId, itemId) {
        return this.req('DELETE', `/vaults/${vaultId}/items/${itemId}`);
    }
    upsertItems(vaultId, items, idempotencyKey) {
        return this.req('POST', `/vaults/${vaultId}/items/upsert`, {
            items,
            ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        });
    }
    previewImport(vaultId, items) {
        return this.req('POST', `/vaults/${vaultId}/items/import-preview`, { items });
    }
    searchItems(vaultId, params) {
        const q = new URLSearchParams();
        if (params.q)
            q.set('q', params.q);
        if (params.author)
            q.set('author', params.author);
        if (params.year !== undefined)
            q.set('year', String(params.year));
        if (params.doi)
            q.set('doi', params.doi);
        if (params.tag_id)
            q.set('tag', params.tag_id);
        if (params.page !== undefined)
            q.set('page', String(params.page));
        if (params.limit !== undefined)
            q.set('per_page', String(params.limit));
        const qs = q.toString() ? `?${q}` : '';
        return this.req('GET', `/vaults/${vaultId}/search${qs}`);
    }
    getStats(vaultId) {
        return this.req('GET', `/vaults/${vaultId}/stats`);
    }
    getChanges(vaultId, since) {
        return this.req('GET', `/vaults/${vaultId}/changes?since=${encodeURIComponent(since)}`);
    }
    // ── Tags ─────────────────────────────────────────────────────────────────────
    listTags(vaultId) {
        return this.req('GET', `/vaults/${vaultId}/tags`);
    }
    createTag(vaultId, body) {
        return this.req('POST', `/vaults/${vaultId}/tags`, body);
    }
    updateTag(vaultId, tagId, body) {
        return this.req('PATCH', `/vaults/${vaultId}/tags/${tagId}`, body);
    }
    deleteTag(vaultId, tagId) {
        return this.req('DELETE', `/vaults/${vaultId}/tags/${tagId}`);
    }
    attachTags(vaultId, itemId, tagIds) {
        return this.req('POST', `/vaults/${vaultId}/tags/attach`, { item_id: itemId, tag_ids: tagIds });
    }
    detachTags(vaultId, itemId, tagIds) {
        return this.req('POST', `/vaults/${vaultId}/tags/detach`, { item_id: itemId, tag_ids: tagIds });
    }
    // ── Relations ────────────────────────────────────────────────────────────────
    listRelations(vaultId, type) {
        const qs = type ? `?type=${encodeURIComponent(type)}` : '';
        return this.req('GET', `/vaults/${vaultId}/relations${qs}`);
    }
    createRelation(vaultId, body) {
        return this.req('POST', `/vaults/${vaultId}/relations`, body);
    }
    updateRelation(vaultId, relationId, body) {
        return this.req('PATCH', `/vaults/${vaultId}/relations/${relationId}`, body);
    }
    deleteRelation(vaultId, relationId) {
        return this.req('DELETE', `/vaults/${vaultId}/relations/${relationId}`);
    }
    // ── Import ───────────────────────────────────────────────────────────────────
    importDoi(vaultId, doi, tagIds = []) {
        return this.req('POST', `/vaults/${vaultId}/import/doi`, { doi, tag_ids: tagIds });
    }
    importBibtex(vaultId, bibtex, tagIds = []) {
        return this.req('POST', `/vaults/${vaultId}/import/bibtex`, { bibtex, tag_ids: tagIds });
    }
    importUrl(vaultId, url, tagIds = []) {
        return this.req('POST', `/vaults/${vaultId}/import/url`, { url, tag_ids: tagIds });
    }
    // ── Export ───────────────────────────────────────────────────────────────────
    exportVault(vaultId, format = 'json') {
        return this.reqText('GET', `/vaults/${vaultId}/export?format=${format}`);
    }
    // ── Audit ────────────────────────────────────────────────────────────────────
    getAudit(vaultId, params = {}) {
        const q = new URLSearchParams();
        if (params.since)
            q.set('since', params.since);
        if (params.until)
            q.set('until', params.until);
        if (params.limit !== undefined)
            q.set('per_page', String(params.limit));
        if (params.page !== undefined)
            q.set('page', String(params.page));
        const qs = q.toString() ? `?${q}` : '';
        return this.req('GET', `/vaults/${vaultId}/audit${qs}`);
    }
    // ── Semantic Scholar discovery/enrichment ──────────────────────────────────
    doiMetadata(doi) {
        return this.req('POST', '/semantic-scholar/doi-metadata', { doi }).then((result) => result.data);
    }
    semanticScholarLookup(body) {
        return this.req('POST', '/semantic-scholar/lookup', body);
    }
    semanticScholarSearch(query, limit) {
        return this.req('POST', '/semantic-scholar/search', { query, ...(limit !== undefined ? { limit } : {}) });
    }
    semanticScholarPaperList(kind, paperId, limit) {
        return this.req('POST', `/semantic-scholar/${kind}`, { paper_id: paperId, ...(limit !== undefined ? { limit } : {}) });
    }
    uploadItemPdf(vaultId, itemId, pdfBuffer) {
        return this.reqBinary('POST', `/vaults/${encodeURIComponent(vaultId)}/items/${encodeURIComponent(itemId)}/pdf`, pdfBuffer, 'application/pdf');
    }
}
// ── Helpers ───────────────────────────────────────────────────────────────────
export function resolveClient(apiKey) {
    const key = apiKey ?? process.env['REFHUB_API_KEY'];
    if (!key) {
        process.stderr.write(JSON.stringify({ error: { code: 'missing_api_key', message: 'No API key found. Set REFHUB_API_KEY or pass --api-key.' } }) + '\n');
        process.exit(3);
    }
    return new RefHubClient(key);
}
export async function run(fn) {
    try {
        await fn();
    }
    catch (err) {
        if (err instanceof RefHubError) {
            process.stderr.write(JSON.stringify({
                error: {
                    code: err.code,
                    message: err.message,
                    request_id: err.request_id,
                    ...(err.retry_after_seconds !== undefined ? { retry_after_seconds: err.retry_after_seconds } : {}),
                },
            }) + '\n');
            process.exit(err.status === 401 ? 3 : 1);
        }
        process.stderr.write(JSON.stringify({ error: { code: 'unexpected_error', message: String(err) } }) + '\n');
        process.exit(1);
    }
}
