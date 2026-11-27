// src/commands/items.ts
import { readFileSync } from 'fs';
import { InvalidArgumentError, type Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

function usageError(code: string, message: string): never {
  process.stderr.write(JSON.stringify({ error: { code, message } }) + '\n');
  process.exit(2);
}

/** Collects a repeatable option into an array. */
export function collectOption(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

/**
 * Parses --year. An empty value means "no year" (cleared on update, left out on add); it comes back
 * as "" because commander replaces a parser's null with "".
 */
export function parseYearOption(value: string): number | '' {
  if (value.trim() === '') return '';
  const year = Number(value);
  if (!Number.isInteger(year)) throw new InvalidArgumentError('must be a whole year, e.g. 2024');
  return year;
}

function splitList(value: string, separator: string): string[] {
  return value.split(separator).map((part) => part.trim()).filter(Boolean);
}

/**
 * The author list from --author (repeatable, one author each, commas kept) or --authors.
 * --authors splits on ";" when the value has one, so "Last, First" names survive; otherwise it
 * keeps splitting on commas as before, with a hint, so existing scripts behave the same.
 */
export function resolveAuthors(author: string[] | undefined, authors: string | undefined): string[] | undefined {
  if (author?.length && authors !== undefined) {
    usageError('invalid_options', 'Pass either --author (repeatable) or --authors, not both.');
  }
  if (author?.length) return author.map((name) => name.trim()).filter(Boolean);
  if (authors === undefined) return undefined;
  const separator = authors.includes(';') ? ';' : ',';
  const list = splitList(authors, separator);
  if (separator === ',' && list.length > 1) {
    process.stderr.write(JSON.stringify({
      warning: 'authors_split_on_commas',
      message: `--authors was split on commas into ${list.length} authors. For "Last, First" names, repeat --author once per author, or separate authors with ";".`,
    }) + '\n');
  }
  return list;
}

export async function handleItemsList(
  client: RefHubClient,
  vaultId: string,
  opts: { page?: number; limit?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.listItems(vaultId, opts);
  format(result, tableMode, ['id', 'title', 'authors', 'year', 'doi', 'updated_at']);
}

export async function handleItemGet(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.getItem(vaultId, itemId);
  format(result, tableMode);
}

export async function handleItemAdd(
  client: RefHubClient,
  vaultId: string,
  opts: { title: string; author?: string[]; authors?: string; year?: number | '' | null; doi?: string; url?: string; tags?: string; notes?: string; pdfUrl?: string },
  tableMode: boolean,
): Promise<void> {
  // On add, an empty optional value is simply left out; the title is required.
  if (!opts.title.trim()) usageError('invalid_value', '--title cannot be empty.');
  const item: Record<string, unknown> = { title: opts.title };
  const authors = resolveAuthors(opts.author, opts.authors);
  if (authors?.length) item['authors'] = authors;
  if (typeof opts.year === 'number') item['year'] = opts.year;
  if (opts.doi) item['doi'] = opts.doi;
  if (opts.url) item['url'] = opts.url;
  const tagIds = opts.tags ? splitList(opts.tags, ',') : [];
  if (tagIds.length) item['tag_ids'] = tagIds;
  if (opts.notes) item['notes'] = opts.notes;
  if (opts.pdfUrl) item['pdf_url'] = opts.pdfUrl;
  const result = await client.addItems(vaultId, [item as Parameters<RefHubClient['addItems']>[1][number]]);
  format(result, tableMode, ['id', 'title', 'doi', 'year']);
}

export async function handleItemUpdate(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  opts: {
    title?: string; author?: string[]; authors?: string; year?: number | '' | null; doi?: string; url?: string; tags?: string; notes?: string; pdfUrl?: string;
    section?: string; unsetSection?: boolean; featured?: boolean; unfeature?: boolean; featuredNote?: string;
  },
  tableMode: boolean,
): Promise<void> {
  // On update, an empty value clears an optional field; the title can't be cleared.
  const body: Record<string, unknown> = {};
  if (opts.title !== undefined) {
    if (!opts.title.trim()) usageError('invalid_value', '--title cannot be empty; every item needs a title.');
    body['title'] = opts.title;
  }
  const authors = resolveAuthors(opts.author, opts.authors);
  if (authors !== undefined) body['authors'] = authors;
  if (opts.year !== undefined) body['year'] = opts.year === '' ? null : opts.year;
  if (opts.doi !== undefined) body['doi'] = opts.doi;
  if (opts.url !== undefined) body['url'] = opts.url;
  if (opts.notes !== undefined) body['notes'] = opts.notes;
  if (opts.pdfUrl !== undefined) body['pdf_url'] = opts.pdfUrl;
  if (opts.tags !== undefined) {
    process.stderr.write(
      JSON.stringify({ warning: 'tag_replacement', message: '--tags replaces the full tag set, not an append. Existing tags will be removed.' }) + '\n',
    );
    body['tag_ids'] = splitList(opts.tags, ',');
  }
  if (opts.section !== undefined) body['section_id'] = opts.section;
  if (opts.unsetSection) body['section_id'] = null;
  if (opts.featured) body['featured'] = true;
  if (opts.unfeature) body['featured'] = false;
  if (opts.featuredNote !== undefined) body['featured_note'] = opts.featuredNote;
  const result = await client.updateItem(vaultId, itemId, body as Parameters<RefHubClient['updateItem']>[2]);
  format(result, tableMode);
}

export async function handleItemDelete(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  confirmed: boolean,
): Promise<void> {
  if (!confirmed) {
    process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge this is a hard delete with no undo.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.deleteItem(vaultId, itemId);
  format(result, false);
}

export async function handleItemUpsert(
  client: RefHubClient,
  vaultId: string,
  filePath: string,
  idempotencyKey: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const items = JSON.parse(readFileSync(filePath, 'utf8')) as unknown[];
  if (!Array.isArray(items)) {
    process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of items.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.upsertItems(vaultId, items, idempotencyKey);
  format(result, tableMode);
}

export async function handleItemPreview(
  client: RefHubClient,
  vaultId: string,
  filePath: string,
  tableMode: boolean,
): Promise<void> {
  const items = JSON.parse(readFileSync(filePath, 'utf8')) as unknown[];
  if (!Array.isArray(items)) {
    process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of items.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.previewImport(vaultId, items);
  format(result, tableMode);
}

export async function handleItemSearch(
  client: RefHubClient,
  vaultId: string,
  opts: { q?: string; author?: string; year?: number; doi?: string; tag?: string; page?: number; limit?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.searchItems(vaultId, {
    q: opts.q,
    author: opts.author,
    year: opts.year,
    doi: opts.doi,
    tag_id: opts.tag,
    page: opts.page,
    limit: opts.limit,
  });
  format(result, tableMode, ['id', 'title', 'authors', 'year', 'doi']);
}

export async function handleItemStats(
  client: RefHubClient,
  vaultId: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.getStats(vaultId);
  format(result, tableMode);
}

export async function handleItemChanges(
  client: RefHubClient,
  vaultId: string,
  since: string,
  tableMode: boolean,
): Promise<void> {
  const result = await client.getChanges(vaultId, since);
  format(result, tableMode, ['id', 'title', 'updated_at']);
}

export function registerItems(program: Command): void {
  const items = program.command('items').description('Manage vault items');

  items
    .command('list')
    .description('List items in a vault')
    .requiredOption('--vault <id>')
    .option('--page <n>', 'page number', (v) => parseInt(v, 10))
    .option('--limit <n>', 'results per page', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemsList(client, opts.vault, { page: opts.page, limit: opts.limit }, g.table ?? false));
    });

  items
    .command('get')
    .argument('<itemId>')
    .description('Get a single item')
    .requiredOption('--vault <id>')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemGet(client, opts.vault, itemId, g.table ?? false));
    });

  items
    .command('add')
    .description('Add an item to a vault')
    .requiredOption('--vault <id>')
    .requiredOption('--title <title>')
    .option('--author <name>', 'one author; repeat for each (commas allowed: "Smith, John")', collectOption)
    .option('--authors <authors>', 'all authors: separate with ";" ("Smith, John; Doe, Jane"); without ";", commas separate authors')
    .option('--year <year>', 'publication year', parseYearOption)
    .option('--doi <doi>')
    .option('--url <url>', 'publication URL')
    .option('--tags <ids>', 'comma-separated tag IDs')
    .option('--notes <text>', 'free-text notes on the item')
    .option('--pdf-url <url>', "publisher PDF link (the frontend's publisher_pdf field)")
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemAdd(client, opts.vault, { title: opts.title, author: opts.author, authors: opts.authors, year: opts.year, doi: opts.doi, url: opts.url, tags: opts.tags, notes: opts.notes, pdfUrl: opts.pdfUrl }, g.table ?? false));
    });

  items
    .command('update')
    .argument('<itemId>')
    .description('Update an item')
    .requiredOption('--vault <id>')
    .option('--title <title>')
    .option('--author <name>', 'one author; repeat for each (commas allowed). Replaces the author list', collectOption)
    .option('--authors <authors>', 'all authors: separate with ";"; without ";", commas separate authors. "" clears them')
    .option('--year <year>', 'publication year; "" clears it', parseYearOption)
    .option('--doi <doi>', 'DOI; "" clears it')
    .option('--url <url>', 'publication URL')
    .option('--tags <ids>', 'comma-separated tag IDs — REPLACES the full tag set')
    .option('--notes <text>', 'free-text notes on the item')
    .option('--pdf-url <url>', "publisher PDF link (the frontend's publisher_pdf field)")
    .option('--section <sectionId>', 'file this item under a curated section — requires vault owner access')
    .option('--unset-section', 'remove this item from its current section — requires vault owner access')
    .option('--featured', 'mark this item as featured — requires vault owner access')
    .option('--unfeature', 'remove this item from featured — requires vault owner access')
    .option('--featured-note <text>', 'curator note shown alongside the featured item — requires vault owner access')
    .action(async (itemId, opts, cmd) => {
      if (opts.section && opts.unsetSection) {
        process.stderr.write(JSON.stringify({ error: { code: 'invalid_options', message: 'Pass at most one of --section or --unset-section.' } }) + '\n');
        process.exit(2);
      }
      if (opts.featured && opts.unfeature) {
        process.stderr.write(JSON.stringify({ error: { code: 'invalid_options', message: 'Pass at most one of --featured or --unfeature.' } }) + '\n');
        process.exit(2);
      }
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemUpdate(client, opts.vault, itemId, {
        title: opts.title, author: opts.author, authors: opts.authors, year: opts.year, doi: opts.doi, url: opts.url, tags: opts.tags, notes: opts.notes, pdfUrl: opts.pdfUrl,
        section: opts.section, unsetSection: opts.unsetSection, featured: opts.featured, unfeature: opts.unfeature, featuredNote: opts.featuredNote,
      }, g.table ?? false));
    });

  items
    .command('delete')
    .argument('<itemId>')
    .description('Delete an item (hard delete, no undo)')
    .requiredOption('--vault <id>')
    .option('--confirm', 'required: acknowledge permanent deletion')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemDelete(client, opts.vault, itemId, opts.confirm ?? false));
    });

  items
    .command('upsert')
    .description('Bulk upsert items from a JSON file')
    .requiredOption('--vault <id>')
    .requiredOption('--file <path>', 'path to JSON file containing array of items')
    .option('--idempotency-key <key>', 'safe retry key')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemUpsert(client, opts.vault, opts.file, opts.idempotencyKey, g.table ?? false));
    });

  items
    .command('preview')
    .description('Dry-run upsert — shows what would change without writing')
    .requiredOption('--vault <id>')
    .requiredOption('--file <path>', 'path to JSON file containing array of items')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemPreview(client, opts.vault, opts.file, g.table ?? false));
    });

  items
    .command('search')
    .description('Search items in a vault')
    .requiredOption('--vault <id>')
    .option('--q <query>', 'full-text search')
    .option('--author <author>')
    .option('--year <year>', '', (v) => parseInt(v, 10))
    .option('--doi <doi>')
    .option('--tag <tagId>')
    .option('--page <n>', '', (v) => parseInt(v, 10))
    .option('--limit <n>', '', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemSearch(client, opts.vault, { q: opts.q, author: opts.author, year: opts.year, doi: opts.doi, tag: opts.tag, page: opts.page, limit: opts.limit }, g.table ?? false));
    });

  items
    .command('stats')
    .description('Get vault statistics')
    .requiredOption('--vault <id>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemStats(client, opts.vault, g.table ?? false));
    });

  items
    .command('changes')
    .description('Get items changed since a timestamp')
    .requiredOption('--vault <id>')
    .requiredOption('--since <ISO>', 'ISO 8601 timestamp')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleItemChanges(client, opts.vault, opts.since, g.table ?? false));
    });
}
