// src/commands/sections.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleSectionsList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void> {
  const result = await client.listSections(vaultId);
  format(result, tableMode, ['id', 'name', 'description', 'position']);
}

export async function handleSectionCreate(
  client: RefHubClient,
  vaultId: string,
  opts: { name: string; description?: string; position?: number },
  tableMode: boolean,
): Promise<void> {
  const body: { name: string; description?: string; position?: number } = { name: opts.name };
  if (opts.description !== undefined) body.description = opts.description;
  if (opts.position !== undefined) body.position = opts.position;
  const result = await client.createSection(vaultId, body);
  format(result, tableMode);
}

export async function handleSectionUpdate(
  client: RefHubClient,
  vaultId: string,
  sectionId: string,
  opts: { name?: string; description?: string; position?: number },
  tableMode: boolean,
): Promise<void> {
  const body: { name?: string; description?: string; position?: number } = {};
  if (opts.name !== undefined) body.name = opts.name;
  if (opts.description !== undefined) body.description = opts.description;
  if (opts.position !== undefined) body.position = opts.position;
  const result = await client.updateSection(vaultId, sectionId, body);
  format(result, tableMode);
}

export async function handleSectionDelete(client: RefHubClient, vaultId: string, sectionId: string): Promise<void> {
  const result = await client.deleteSection(vaultId, sectionId);
  format(result, false);
}

export function registerSections(program: Command): void {
  const sections = program.command('sections').description('Manage curated vault sections (owner-only writes)');

  sections
    .command('list')
    .description('List sections in a vault')
    .requiredOption('--vault <id>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleSectionsList(client, opts.vault, g.table ?? false));
    });

  sections
    .command('create')
    .description('Create a section (owner-only)')
    .requiredOption('--vault <id>')
    .requiredOption('--name <name>')
    .option('--description <text>')
    .option('--position <n>', 'sort position, defaults to 0', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleSectionCreate(client, opts.vault, { name: opts.name, description: opts.description, position: opts.position }, g.table ?? false));
    });

  sections
    .command('update')
    .argument('<sectionId>')
    .description('Update a section (owner-only)')
    .requiredOption('--vault <id>')
    .option('--name <name>')
    .option('--description <text>')
    .option('--position <n>', '', (v) => parseInt(v, 10))
    .action(async (sectionId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleSectionUpdate(client, opts.vault, sectionId, { name: opts.name, description: opts.description, position: opts.position }, g.table ?? false));
    });

  sections
    .command('delete')
    .argument('<sectionId>')
    .description('Delete a section (owner-only) — items in it are unfiled, not deleted')
    .requiredOption('--vault <id>')
    .action(async (sectionId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleSectionDelete(client, opts.vault, sectionId));
    });
}
