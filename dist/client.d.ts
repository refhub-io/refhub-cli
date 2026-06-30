import type { ApiResponse, Vault, VaultDetail, Share, Item, UpsertResult, PreviewResult, Tag, Relation, BibTeXImportResult, AuditEntry, VaultStats, RelationType, SemanticScholarPaper, SemanticScholarDoiMetadata } from './types.js';
export declare class RefHubError extends Error {
    readonly code: string;
    readonly request_id: string;
    readonly status: number;
    readonly retry_after_seconds?: number;
    constructor(status: number, code: string, message: string, request_id: string, retry_after_seconds?: number);
}
export declare class RefHubClient {
    static readonly RAW_PDF_UPLOAD_LIMIT_BYTES: number;
    private readonly baseUrl;
    private readonly headers;
    constructor(apiKey: string);
    private req;
    private reqBinary;
    private reqText;
    listVaults(): Promise<ApiResponse<Vault[]>>;
    getVault(vaultId: string): Promise<ApiResponse<VaultDetail>>;
    createVault(body: {
        name: string;
        description?: string;
        color?: string;
        visibility?: string;
        category?: string;
        abstract?: string;
    }): Promise<ApiResponse<Vault>>;
    updateVault(vaultId: string, body: {
        name?: string;
        description?: string;
        color?: string;
        category?: string;
        abstract?: string;
    }): Promise<ApiResponse<Vault>>;
    deleteVault(vaultId: string): Promise<ApiResponse<{
        id: string;
    }>>;
    setVaultVisibility(vaultId: string, body: {
        visibility: string;
        public_slug?: string;
    }): Promise<ApiResponse<Vault>>;
    listShares(vaultId: string): Promise<ApiResponse<Share[]>>;
    addShare(vaultId: string, body: {
        email: string;
        role: 'viewer' | 'editor';
        name?: string;
    }): Promise<ApiResponse<Share>>;
    updateShare(vaultId: string, shareId: string, body: {
        role: 'viewer' | 'editor';
    }): Promise<ApiResponse<Share>>;
    removeShare(vaultId: string, shareId: string): Promise<ApiResponse<{
        id: string;
    }>>;
    listItems(vaultId: string, params?: {
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<Item[]>>;
    getItem(vaultId: string, itemId: string): Promise<ApiResponse<Item>>;
    addItems(vaultId: string, items: Array<{
        title: string;
        authors?: string[];
        year?: number;
        doi?: string;
        tag_ids?: string[];
    }>): Promise<ApiResponse<Item[]>>;
    updateItem(vaultId: string, itemId: string, body: {
        title?: string;
        authors?: string[];
        year?: number;
        doi?: string;
        tag_ids?: string[];
    }): Promise<ApiResponse<Item>>;
    deleteItem(vaultId: string, itemId: string): Promise<ApiResponse<{
        id: string;
    }>>;
    upsertItems(vaultId: string, items: unknown[], idempotencyKey?: string): Promise<ApiResponse<UpsertResult>>;
    previewImport(vaultId: string, items: unknown[]): Promise<ApiResponse<PreviewResult>>;
    searchItems(vaultId: string, params: {
        q?: string;
        author?: string;
        year?: number;
        doi?: string;
        tag_id?: string;
        page?: number;
        limit?: number;
    }): Promise<ApiResponse<Item[]>>;
    getStats(vaultId: string): Promise<ApiResponse<VaultStats>>;
    getChanges(vaultId: string, since: string): Promise<ApiResponse<Item[]>>;
    listTags(vaultId: string): Promise<ApiResponse<Tag[]>>;
    createTag(vaultId: string, body: {
        name: string;
        color?: string;
        parent_id?: string;
    }): Promise<ApiResponse<Tag>>;
    updateTag(vaultId: string, tagId: string, body: {
        name?: string;
        color?: string;
        parent_id?: string;
    }): Promise<ApiResponse<Tag>>;
    deleteTag(vaultId: string, tagId: string): Promise<ApiResponse<{
        id: string;
    }>>;
    attachTags(vaultId: string, itemId: string, tagIds: string[]): Promise<ApiResponse<{
        item_id: string;
        tag_ids: string[];
    }>>;
    detachTags(vaultId: string, itemId: string, tagIds: string[]): Promise<ApiResponse<{
        item_id: string;
        tag_ids: string[];
    }>>;
    listRelations(vaultId: string, type?: string): Promise<ApiResponse<Relation[]>>;
    createRelation(vaultId: string, body: {
        publication_id: string;
        related_publication_id: string;
        relation_type?: RelationType;
    }): Promise<ApiResponse<Relation>>;
    updateRelation(vaultId: string, relationId: string, body: {
        relation_type: RelationType;
    }): Promise<ApiResponse<Relation>>;
    deleteRelation(vaultId: string, relationId: string): Promise<ApiResponse<{
        id: string;
    }>>;
    importDoi(vaultId: string, doi: string, tagIds?: string[]): Promise<ApiResponse<{
        item: Item;
    }>>;
    importBibtex(vaultId: string, bibtex: string, tagIds?: string[]): Promise<ApiResponse<BibTeXImportResult>>;
    importUrl(vaultId: string, url: string, tagIds?: string[]): Promise<ApiResponse<{
        item: Item;
    }>>;
    exportVault(vaultId: string, format?: 'json' | 'bibtex'): Promise<string>;
    getAudit(vaultId: string, params?: {
        since?: string;
        until?: string;
        limit?: number;
        page?: number;
    }): Promise<ApiResponse<AuditEntry[]>>;
    doiMetadata(doi: string): Promise<SemanticScholarDoiMetadata | null>;
    semanticScholarLookup(body: {
        doi?: string;
        title?: string;
    }): Promise<ApiResponse<{
        paper_id: string;
    }>>;
    semanticScholarSearch(query: string, limit?: number): Promise<ApiResponse<SemanticScholarPaper[]>>;
    semanticScholarPaperList(kind: 'recommendations' | 'related' | 'references' | 'citations' | 'cited-by', paperId: string, limit?: number): Promise<ApiResponse<SemanticScholarPaper[]>>;
    uploadItemPdfRaw(vaultId: string, itemId: string, pdfBuffer: Buffer): Promise<ApiResponse<PdfUploadResult>>;
    createItemPdfUploadSession(vaultId: string, itemId: string): Promise<ApiResponse<PdfUploadSession>>;
    completeItemPdfUpload(vaultId: string, itemId: string, body: {
        file_id: string;
        web_view_link?: string | null;
        source_url?: string | null;
    }): Promise<ApiResponse<PdfUploadResult>>;
    uploadItemPdfResumable(vaultId: string, itemId: string, pdfBuffer: Buffer): Promise<ApiResponse<PdfUploadResult>>;
    uploadItemPdf(vaultId: string, itemId: string, pdfBuffer: Buffer): Promise<ApiResponse<PdfUploadResult>>;
}
export interface PdfUploadResult {
    attempted: boolean;
    stored: boolean;
    provider: string;
    fileId?: string;
    folderId?: string;
    folderName?: string;
    pdfUrl?: string;
    sourceUrl?: string | null;
}
export interface PdfUploadSession {
    upload_url: string;
    file_name?: string;
}
export declare function resolveClient(apiKey?: string): RefHubClient;
export declare function run(fn: () => Promise<void>): Promise<void>;
