import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleItemsList(client: RefHubClient, vaultId: string, opts: {
    page?: number;
    limit?: number;
}, tableMode: boolean): Promise<void>;
export declare function handleItemGet(client: RefHubClient, vaultId: string, itemId: string, tableMode: boolean): Promise<void>;
export declare function handleItemAdd(client: RefHubClient, vaultId: string, opts: {
    title: string;
    authors?: string;
    year?: number;
    doi?: string;
    tags?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleItemUpdate(client: RefHubClient, vaultId: string, itemId: string, opts: {
    title?: string;
    authors?: string;
    year?: number;
    doi?: string;
    tags?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleItemDelete(client: RefHubClient, vaultId: string, itemId: string, confirmed: boolean): Promise<void>;
export declare function handleItemUpsert(client: RefHubClient, vaultId: string, filePath: string, idempotencyKey: string | undefined, tableMode: boolean): Promise<void>;
export declare function handleItemPreview(client: RefHubClient, vaultId: string, filePath: string, tableMode: boolean): Promise<void>;
export declare function handleItemSearch(client: RefHubClient, vaultId: string, opts: {
    q?: string;
    author?: string;
    year?: number;
    doi?: string;
    tag?: string;
    page?: number;
    limit?: number;
}, tableMode: boolean): Promise<void>;
export declare function handleItemStats(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void>;
export declare function handleItemChanges(client: RefHubClient, vaultId: string, since: string, tableMode: boolean): Promise<void>;
export declare function registerItems(program: Command): void;
