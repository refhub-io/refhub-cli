import type { Command } from 'commander';
import { RefHubClient } from '../client.js';
export declare function handleSectionsList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void>;
export declare function handleSectionCreate(client: RefHubClient, vaultId: string, opts: {
    name: string;
    description?: string;
    position?: number;
}, tableMode: boolean): Promise<void>;
export declare function handleSectionUpdate(client: RefHubClient, vaultId: string, sectionId: string, opts: {
    name?: string;
    description?: string;
    position?: number;
}, tableMode: boolean): Promise<void>;
export declare function handleSectionDelete(client: RefHubClient, vaultId: string, sectionId: string): Promise<void>;
export declare function registerSections(program: Command): void;
