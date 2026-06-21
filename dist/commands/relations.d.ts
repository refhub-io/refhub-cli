import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleRelationsList(client: RefHubClient, vaultId: string, type: string | undefined, tableMode: boolean): Promise<void>;
export declare function handleRelationCreate(client: RefHubClient, vaultId: string, opts: {
    pub: string;
    related: string;
    type?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleRelationUpdate(client: RefHubClient, vaultId: string, relationId: string, type: string, tableMode: boolean): Promise<void>;
export declare function handleRelationDelete(client: RefHubClient, vaultId: string, relationId: string): Promise<void>;
export declare function registerRelations(program: Command): void;
