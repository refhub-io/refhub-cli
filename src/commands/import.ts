// src/commands/import.ts
import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

function parseTags(tagsCsv?: string): string[] {
  if (!tagsCsv) return [];
  return tagsCsv.split(',').map((t) => t.trim());
}

export async function handleImportDoi(
  client: RefHubClient,
  vaultId: string,
  doi: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.importDoi(vaultId, doi, parseTags(tagsCsv));
  format(result, tableMode);
}

export async function handleImportBibtex(
  client: RefHubClient,
  vaultId: string,
  bibtexOrPath: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.importBibtex(vaultId, bibtexOrPath, parseTags(tagsCsv));
  format(result, tableMode);
}

export async function handleImportUrl(
  client: RefHubClient,
  vaultId: string,
  url: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.importUrl(vaultId, url, parseTags(tagsCsv));
  format(result, tableMode);
}

export function registerImport(program: Command): void {
  const imp = program.command('import').description('Import references into a vault');

  imp
    .command('doi')
    .description('Import a reference by DOI')
    .requiredOption('--vault <id>')
    .requiredOption('--doi <doi>')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleImportDoi(client, opts.vault, opts.doi, opts.tags, g.table ?? false));
    });

  imp
    .command('bibtex')
    .description('Import references from a BibTeX string or file')
    .requiredOption('--vault <id>')
    .option('--bibtex <string>', 'inline BibTeX string')
    .option('--file <path>', 'path to .bib file')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      if (!opts.bibtex && !opts.file) {
        process.stderr.write(JSON.stringify({ error: { code: 'missing_input', message: 'Provide --bibtex <string> or --file <path>.' } }) + '\n');
        process.exit(2);
      }
      const bibtex: string = opts.file ? readFileSync(opts.file, 'utf8') : opts.bibtex;
      const client = resolveClient(g.apiKey);
      await run(() => handleImportBibtex(client, opts.vault, bibtex, opts.tags, g.table ?? false));
    });

  imp
    .command('url')
    .description('Import a reference from a URL (Open Graph scrape)')
    .requiredOption('--vault <id>')
    .requiredOption('--url <url>')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleImportUrl(client, opts.vault, opts.url, opts.tags, g.table ?? false));
    });
}
