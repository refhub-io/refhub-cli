// src/commands/export.ts
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';

export async function handleExport(
  client: RefHubClient,
  vaultId: string,
  outputFormat: 'json' | 'bibtex',
): Promise<void> {
  const raw = await client.exportVault(vaultId, outputFormat);
  process.stdout.write(raw + '\n');
}

export function registerExport(program: Command): void {
  program
    .command('export')
    .description('Export a vault as JSON or BibTeX')
    .requiredOption('--vault <id>')
    .option('--format <format>', 'json|bibtex', 'json')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      const fmt = opts.format === 'bibtex' ? 'bibtex' : 'json';
      await run(() => handleExport(client, opts.vault, fmt));
    });
}
