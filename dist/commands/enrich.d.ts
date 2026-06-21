import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
import type { Item } from '../types.js';
export declare function enrichItem(item: Item, client: RefHubClient, vaultId: string, dryRun: boolean): Promise<'enriched' | 'skipped' | 'not_found' | 'no_missing_fields'>;
export declare function registerEnrich(program: Command): void;
