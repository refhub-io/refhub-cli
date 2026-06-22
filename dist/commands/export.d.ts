import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleExport(client: RefHubClient, vaultId: string, outputFormat: 'json' | 'bibtex'): Promise<void>;
export declare function registerExport(program: Command): void;
