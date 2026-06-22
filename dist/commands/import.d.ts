import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleImportDoi(client: RefHubClient, vaultId: string, doi: string, tagsCsv: string | undefined, tableMode: boolean): Promise<void>;
export declare function handleImportBibtex(client: RefHubClient, vaultId: string, bibtex: string, tagsCsv: string | undefined, tableMode: boolean): Promise<void>;
export declare function handleImportUrl(client: RefHubClient, vaultId: string, url: string, tagsCsv: string | undefined, tableMode: boolean): Promise<void>;
export declare function registerImport(program: Command): void;
