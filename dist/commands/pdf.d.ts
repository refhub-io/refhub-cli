import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handlePdfUpload(client: RefHubClient, vaultId: string, itemId: string, filePath: string, tableMode: boolean): Promise<void>;
export declare function registerPdf(program: Command): void;
