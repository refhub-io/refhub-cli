// src/commands/relations.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

const RELATION_TYPES = 'cites|extends|builds_on|contradicts|reviews|related';

export async function handleRelationsList(
  client: RefHubClient,
  vaultId: string,
  type: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.listRelations(vaultId, type);
  format(result, tableMode, ['id', 'publication_id', 'related_publication_id', 'relation_type']);
}

export async function handleRelationCreate(
  client: RefHubClient,
  vaultId: string,
  opts: { pub: string; related: string; type?: string },
  tableMode: boolean,
): Promise<void> {
  const result = await client.createRelation(vaultId, {
    publication_id: opts.pub,
    related_publication_id: opts.related,
    relation_type: opts.type as import('../types.js').RelationType | undefined,
  });
  format(result, tableMode);
}

export async function handleRelationUpdate(
  client: RefHubClient,
  vaultId: string,
  relationId: string,
  type: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.updateRelation(vaultId, relationId, { relation_type: type as import('../types.js').RelationType });
  format(result, tableMode);
}

export async function handleRelationDelete(
  client: RefHubClient,
  vaultId: string,
  relationId: string,
): Promise<void> {
  const result = await client.deleteRelation(vaultId, relationId);
  format(result, false);
}

export function registerRelations(program: Command): void {
  const relations = program.command('relations').description('Manage vault relations');

  relations
    .command('list')
    .description('List relations in a vault')
    .requiredOption('--vault <id>')
    .option('--type <type>', RELATION_TYPES)
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationsList(client, opts.vault, opts.type, g.table ?? false));
    });

  relations
    .command('create')
    .description('Create a relation between two publications')
    .requiredOption('--vault <id>')
    .requiredOption('--pub <publicationId>')
    .requiredOption('--related <publicationId>')
    .option('--type <type>', RELATION_TYPES)
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationCreate(client, opts.vault, { pub: opts.pub, related: opts.related, type: opts.type }, g.table ?? false));
    });

  relations
    .command('update')
    .argument('<relationId>')
    .description('Update a relation type')
    .requiredOption('--vault <id>')
    .requiredOption('--type <type>', RELATION_TYPES)
    .action(async (relationId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationUpdate(client, opts.vault, relationId, opts.type, g.table ?? false));
    });

  relations
    .command('delete')
    .argument('<relationId>')
    .description('Delete a relation')
    .requiredOption('--vault <id>')
    .action(async (relationId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleRelationDelete(client, opts.vault, relationId));
    });
}
