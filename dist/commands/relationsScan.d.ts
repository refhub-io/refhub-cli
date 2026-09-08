import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
import type { Item, Relation, SemanticScholarPaper } from '../types.js';
export declare function findMatchingItem(paper: SemanticScholarPaper, items: Item[], excludeId: string): Item | undefined;
export type ScanOutcome = 'skipped_no_doi' | 'lookup_failed' | 'no_matches' | 'scanned';
export interface ScanItemResult {
    outcome: ScanOutcome;
    suggested: number;
    created: number;
    skippedDuplicate: number;
}
/**
 * Scans one item's Semantic Scholar references (papers it cites) and
 * citations (papers that cite it), matches each against `allItems`, and
 * creates a "cites" relation for every new match. `existingRelations` is
 * mutated with pending creations so a whole-vault scan doesn't propose the
 * same pair twice across items.
 */
export declare function scanItemRelations(item: Item, client: RefHubClient, vaultId: string, allItems: Item[], existingRelations: Relation[], opts: {
    dryRun: boolean;
    limit?: number;
}): Promise<ScanItemResult>;
export declare function registerRelationsScan(relations: Command): void;
