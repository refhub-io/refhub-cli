import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleVaultsList(client: RefHubClient, tableMode: boolean): Promise<void>;
export declare function handleVaultGet(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void>;
export declare function handleVaultCreate(client: RefHubClient, opts: {
    name: string;
    description?: string;
    color?: string;
    visibility?: string;
    category?: string;
    abstract?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleVaultUpdate(client: RefHubClient, vaultId: string, opts: {
    name?: string;
    description?: string;
    color?: string;
    category?: string;
    abstract?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleVaultDelete(client: RefHubClient, vaultId: string, confirmed: boolean): Promise<void>;
export declare function handleVaultVisibility(client: RefHubClient, vaultId: string, opts: {
    visibility: string;
    slug?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleSharesList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void>;
export declare function handleShareAdd(client: RefHubClient, vaultId: string, opts: {
    email: string;
    role: 'viewer' | 'editor';
    name?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleShareUpdate(client: RefHubClient, vaultId: string, shareId: string, role: 'viewer' | 'editor', tableMode: boolean): Promise<void>;
export declare function handleShareRemove(client: RefHubClient, vaultId: string, shareId: string): Promise<void>;
export declare function registerVaults(program: Command): void;
