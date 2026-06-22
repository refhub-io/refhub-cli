import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
import type { SemanticScholarPaper } from '../types.js';
export declare function paperToItem(paper: SemanticScholarPaper): Record<string, unknown>;
export declare function handleDiscoverSearch(client: RefHubClient, query: string, limit: number | undefined, tableMode: boolean): Promise<void>;
export declare function handleDiscoverLookup(client: RefHubClient, opts: {
    doi?: string;
    title?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleDiscoverList(client: RefHubClient, kind: 'recommendations' | 'related' | 'references' | 'citations' | 'cited-by', paperId: string, limit: number | undefined, tableMode: boolean): Promise<void>;
export declare function handleDiscoverAdd(client: RefHubClient, vaultId: string, filePath: string, idempotencyKey: string | undefined, tableMode: boolean): Promise<void>;
export declare function registerDiscover(program: Command): void;
