import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleAudit(client: RefHubClient, vaultId: string, opts: {
    since?: string;
    until?: string;
    limit?: number;
    page?: number;
}, tableMode: boolean): Promise<void>;
export declare function registerAudit(program: Command): void;
