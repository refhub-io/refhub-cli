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
  original_publication_id: string;
  title: string;
  authors?: string[];
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
