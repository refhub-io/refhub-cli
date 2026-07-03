// src/commands/items.ts
import { readFileSync } from 'fs';
import { resolveClient, run } from '../client.js';
import { format } from '../format.js';
export async function handleItemsList(client, vaultId, opts, tableMode) {
    const result = await client.listItems(vaultId, opts);
    format(result, tableMode, ['id', 'title', 'authors', 'year', 'doi', 'updated_at']);
}
export async function handleItemGet(client, vaultId, itemId, tableMode) {
    const result = await client.getItem(vaultId, itemId);
    format(result, tableMode);
}
export async function handleItemAdd(client, vaultId, opts, tableMode) {
    const item = { title: opts.title };
    if (opts.authors)
        item['authors'] = opts.authors.split(',').map((a) => a.trim());
    if (opts.year !== undefined)
        item['year'] = opts.year;
    if (opts.doi)
        item['doi'] = opts.doi;
    if (opts.tags)
        item['tag_ids'] = opts.tags.split(',').map((t) => t.trim());
    if (opts.notes !== undefined)
        item['notes'] = opts.notes;
    const result = await client.addItems(vaultId, [item]);
    format(result, tableMode, ['id', 'title', 'doi', 'year']);
}
export async function handleItemUpdate(client, vaultId, itemId, opts, tableMode) {
    const body = {};
    if (opts.title)
        body['title'] = opts.title;
    if (opts.authors)
        body['authors'] = opts.authors.split(',').map((a) => a.trim());
    if (opts.year !== undefined)
        body['year'] = opts.year;
    if (opts.doi)
        body['doi'] = opts.doi;
    if (opts.notes !== undefined)
        body['notes'] = opts.notes;
    if (opts.tags) {
        process.stderr.write(JSON.stringify({ warning: 'tag_replacement', message: '--tags replaces the full tag set, not an append. Existing tags will be removed.' }) + '\n');
        body['tag_ids'] = opts.tags.split(',').map((t) => t.trim());
    }
    const result = await client.updateItem(vaultId, itemId, body);
    format(result, tableMode);
}
export async function handleItemDelete(client, vaultId, itemId, confirmed) {
    if (!confirmed) {
        process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge this is a hard delete with no undo.' } }) + '\n');
        process.exit(2);
    }
    const result = await client.deleteItem(vaultId, itemId);
    format(result, false);
}
export async function handleItemUpsert(client, vaultId, filePath, idempotencyKey, tableMode) {
    const items = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(items)) {
        process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of items.' } }) + '\n');
        process.exit(2);
    }
    const result = await client.upsertItems(vaultId, items, idempotencyKey);
    format(result, tableMode);
}
export async function handleItemPreview(client, vaultId, filePath, tableMode) {
    const items = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(items)) {
        process.stderr.write(JSON.stringify({ error: { code: 'invalid_file', message: 'File must contain a JSON array of items.' } }) + '\n');
        process.exit(2);
    }
    const result = await client.previewImport(vaultId, items);
    format(result, tableMode);
}
export async function handleItemSearch(client, vaultId, opts, tableMode) {
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
export async function handleItemStats(client, vaultId, tableMode) {
    const result = await client.getStats(vaultId);
    format(result, tableMode);
}
export async function handleItemChanges(client, vaultId, since, tableMode) {
    const result = await client.getChanges(vaultId, since);
    format(result, tableMode, ['id', 'title', 'updated_at']);
}
export function registerItems(program) {
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
        .option('--authors <authors>', 'comma-separated, e.g. "Smith J,Doe A"')
        .option('--year <year>', 'publication year', (v) => parseInt(v, 10))
        .option('--doi <doi>')
        .option('--tags <ids>', 'comma-separated tag IDs')
        .option('--notes <text>', 'free-text notes on the item')
        .action(async (opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleItemAdd(client, opts.vault, { title: opts.title, authors: opts.authors, year: opts.year, doi: opts.doi, tags: opts.tags, notes: opts.notes }, g.table ?? false));
    });
    items
        .command('update')
        .argument('<itemId>')
        .description('Update an item')
        .requiredOption('--vault <id>')
        .option('--title <title>')
        .option('--authors <authors>')
        .option('--year <year>', '', (v) => parseInt(v, 10))
        .option('--doi <doi>')
        .option('--tags <ids>', 'comma-separated tag IDs — REPLACES the full tag set')
        .option('--notes <text>', 'free-text notes on the item')
        .action(async (itemId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleItemUpdate(client, opts.vault, itemId, { title: opts.title, authors: opts.authors, year: opts.year, doi: opts.doi, tags: opts.tags, notes: opts.notes }, g.table ?? false));
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
