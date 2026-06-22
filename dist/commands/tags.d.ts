import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleTagsList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void>;
export declare function handleTagCreate(client: RefHubClient, vaultId: string, opts: {
    name: string;
    color?: string;
    parent?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleTagUpdate(client: RefHubClient, vaultId: string, tagId: string, opts: {
    name?: string;
    color?: string;
    parent?: string;
}, tableMode: boolean): Promise<void>;
export declare function handleTagDelete(client: RefHubClient, vaultId: string, tagId: string): Promise<void>;
export declare function handleTagAttach(client: RefHubClient, vaultId: string, itemId: string, tagsCsv: string): Promise<void>;
export declare function handleTagDetach(client: RefHubClient, vaultId: string, itemId: string, tagsCsv: string): Promise<void>;
export declare function registerTags(program: Command): void;
