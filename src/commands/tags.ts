// src/commands/tags.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleTagsList(client: RefHubClient, vaultId: string, tableMode: boolean): Promise<void> {
  const result = await client.listTags(vaultId);
  format(result, tableMode, ['id', 'name', 'color', 'parent_id']);
}

export async function handleTagCreate(
  client: RefHubClient,
  vaultId: string,
  opts: { name: string; color?: string; parent?: string },
  tableMode: boolean,
): Promise<void> {
  const body: { name: string; color?: string; parent_id?: string } = { name: opts.name };
  if (opts.color) body.color = opts.color;
  if (opts.parent) body.parent_id = opts.parent;
  const result = await client.createTag(vaultId, body);
  format(result, tableMode);
}

export async function handleTagUpdate(
  client: RefHubClient,
  vaultId: string,
  tagId: string,
  opts: { name?: string; color?: string; parent?: string },
  tableMode: boolean,
): Promise<void> {
  const body: { name?: string; color?: string; parent_id?: string } = {};
  if (opts.name) body.name = opts.name;
  if (opts.color) body.color = opts.color;
  if (opts.parent) body.parent_id = opts.parent;
  const result = await client.updateTag(vaultId, tagId, body);
  format(result, tableMode);
}

export async function handleTagDelete(client: RefHubClient, vaultId: string, tagId: string): Promise<void> {
  const result = await client.deleteTag(vaultId, tagId);
  format(result, false);
}

export async function handleTagAttach(client: RefHubClient, vaultId: string, itemId: string, tagsCsv: string): Promise<void> {
  const tagIds = tagsCsv.split(',').map((t) => t.trim());
  const result = await client.attachTags(vaultId, itemId, tagIds);
  format(result, false);
}

export async function handleTagDetach(client: RefHubClient, vaultId: string, itemId: string, tagsCsv: string): Promise<void> {
  const tagIds = tagsCsv.split(',').map((t) => t.trim());
  const result = await client.detachTags(vaultId, itemId, tagIds);
  format(result, false);
}

export function registerTags(program: Command): void {
  const tags = program.command('tags').description('Manage vault tags');

  tags
    .command('list')
    .description('List tags in a vault')
    .requiredOption('--vault <id>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagsList(client, opts.vault, g.table ?? false));
    });

  tags
    .command('create')
    .description('Create a tag')
    .requiredOption('--vault <id>')
    .requiredOption('--name <name>')
    .option('--color <color>')
    .option('--parent <tagId>', 'parent tag ID')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagCreate(client, opts.vault, { name: opts.name, color: opts.color, parent: opts.parent }, g.table ?? false));
    });

  tags
    .command('update')
    .argument('<tagId>')
    .description('Update a tag')
    .requiredOption('--vault <id>')
    .option('--name <name>')
    .option('--color <color>')
    .option('--parent <tagId>')
    .action(async (tagId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagUpdate(client, opts.vault, tagId, { name: opts.name, color: opts.color, parent: opts.parent }, g.table ?? false));
    });

  tags
    .command('delete')
    .argument('<tagId>')
    .description('Delete a tag')
    .requiredOption('--vault <id>')
    .action(async (tagId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagDelete(client, opts.vault, tagId));
    });

  tags
    .command('attach')
    .description('Attach tags to an item (idempotent)')
    .requiredOption('--vault <id>')
    .requiredOption('--item <itemId>')
    .requiredOption('--tags <ids>', 'comma-separated tag IDs')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagAttach(client, opts.vault, opts.item, opts.tags));
    });

  tags
    .command('detach')
    .description('Detach tags from an item')
    .requiredOption('--vault <id>')
    .requiredOption('--item <itemId>')
    .requiredOption('--tags <ids>', 'comma-separated tag IDs')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleTagDetach(client, opts.vault, opts.item, opts.tags));
    });
}
