// src/commands/discover.ts
import type { Command } from 'commander';
import { readFileSync } from 'fs';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';
import type { SemanticScholarPaper } from '../types.js';

function authorsToStrings(paper: SemanticScholarPaper): string[] {
  return (paper.authors ?? []).map((a) => a.name).filter((name): name is string => Boolean(name));
}

export function paperToItem(paper: SemanticScholarPaper): Record<string, unknown> {
  const doi = paper.external_ids?.['DOI'] ?? paper.external_ids?.['doi'];
  return {
    title: paper.title ?? 'Untitled Semantic Scholar paper',
    authors: authorsToStrings(paper),
    year: paper.year ?? undefined,
    journal: paper.venue ?? undefined,
    doi: doi ?? undefined,
    url: paper.url ?? undefined,
    abstract: paper.abstract ?? undefined,
    pdf_url: paper.open_access_pdf_url ?? undefined,
    publication_type: 'article',
  };
}

export async function handleDiscoverSearch(
  client: RefHubClient,
  query: string,
  limit: number | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.semanticScholarSearch(query, limit);
  format(result, tableMode, ['paper_id', 'title', 'year', 'venue', 'citation_count', 'open_access_pdf_url']);
}

export async function handleDiscoverLookup(
  client: RefHubClient,
  opts: { doi?: string; title?: string },
  tableMode: boolean,
): Promise<void> {
  const result = await client.semanticScholarLookup(opts);
  format(result, tableMode);
}

export async function handleDiscoverList(
  client: RefHubClient,
  kind: 'recommendations' | 'related' | 'references' | 'citations' | 'cited-by',
  paperId: string,
  limit: number | undefined,
  tableMode: boolean,
): Promise<void> {
  const result = await client.semanticScholarPaperList(kind, paperId, limit);
  format(result, tableMode, ['paper_id', 'title', 'year', 'venue', 'citation_count', 'open_access_pdf_url']);
}

export async function handleDiscoverAdd(
  client: RefHubClient,
  vaultId: string,
  filePath: string,
  idempotencyKey: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const papers = JSON.parse(readFileSync(filePath, 'utf8')) as SemanticScholarPaper[];
  if (!Array.isArray(papers)) {
    process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of Semantic Scholar paper results.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.upsertItems(vaultId, papers.map(paperToItem), idempotencyKey);
  format(result, tableMode);
}

function addPaperListCommand(discover: Command, name: 'recommendations' | 'related' | 'references' | 'citations' | 'cited-by', description: string): void {
  discover
    .command(name)
    .description(description)
    .requiredOption('--paper <paperId>', 'Semantic Scholar paper id, DOI:<doi>, or other supported paper identifier')
    .option('--limit <n>', 'result limit, 1-25', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleDiscoverList(client, name, opts.paper, opts.limit, g.table ?? false));
    });
}

export function registerDiscover(program: Command): void {
  const discover = program.command('discover').description('Semantic Scholar discovery via RefHub API key');

  discover
    .command('search')
    .description('Search Semantic Scholar by keyword/topic')
    .requiredOption('--query <query>', 'keyword/topic query')
    .option('--limit <n>', 'result limit, 1-25', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleDiscoverSearch(client, opts.query, opts.limit, g.table ?? false));
    });

  discover
    .command('lookup')
    .description('Resolve a DOI or title to a Semantic Scholar paper id')
    .option('--doi <doi>')
    .option('--title <title>')
    .action(async (opts, cmd) => {
      if ((opts.doi && opts.title) || (!opts.doi && !opts.title)) {
        process.stderr.write(JSON.stringify({ error: { code: 'invalid_lookup_request', message: 'Provide exactly one of --doi or --title.' } }) + '\n');
        process.exit(2);
      }
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleDiscoverLookup(client, { doi: opts.doi, title: opts.title }, g.table ?? false));
    });

  addPaperListCommand(discover, 'recommendations', 'Get Semantic Scholar recommendations from a seed paper');
  addPaperListCommand(discover, 'related', 'Alias for recommendations');
  addPaperListCommand(discover, 'references', 'Get papers cited by a seed paper');
  addPaperListCommand(discover, 'citations', 'Get papers citing a seed paper');
  addPaperListCommand(discover, 'cited-by', 'Alias for citations');

  discover
    .command('add')
    .description('Upsert selected Semantic Scholar paper JSON results into a vault')
    .requiredOption('--vault <id>')
    .requiredOption('--file <path>', 'JSON array of Semantic Scholar paper results')
    .option('--idempotency-key <key>', 'safe retry key')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleDiscoverAdd(client, opts.vault, opts.file, opts.idempotencyKey, g.table ?? false));
    });
}
