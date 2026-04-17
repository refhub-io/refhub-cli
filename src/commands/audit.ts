// src/commands/audit.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleAudit(
  client: RefHubClient,
  vaultId: string,
  opts: { since?: string; until?: string; limit?: number; page?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.getAudit(vaultId, opts);
  format(result, tableMode, ['id', 'action', 'entity_type', 'entity_id', 'created_at']);
}

export function registerAudit(program: Command): void {
  program
    .command('audit')
    .description('Read vault audit log')
    .requiredOption('--vault <id>')
    .option('--since <ISO>', 'start timestamp (ISO 8601)')
    .option('--until <ISO>', 'end timestamp (ISO 8601)')
    .option('--limit <n>', 'results per page (max 200)', (v) => parseInt(v, 10))
    .option('--page <n>', 'page number', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleAudit(client, opts.vault, { since: opts.since, until: opts.until, limit: opts.limit, page: opts.page }, g.table ?? false));
    });
}
