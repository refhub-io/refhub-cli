import { resolveClient, run } from '../client.js';
export async function enrichItem(item, client, vaultId, dryRun) {
    if (!item.doi)
        return 'skipped';
    const missing = [];
    if (!item.title)
        missing.push('title');
    if (!item.authors || item.authors.length === 0)
        missing.push('authors');
    if (!item.year)
        missing.push('year');
    if (!item.abstract)
        missing.push('abstract');
    if (missing.length === 0)
        return 'no_missing_fields';
    const meta = await client.doiMetadata(item.doi);
    if (!meta)
        return 'not_found';
    const patch = {};
    if (missing.includes('title') && meta.title)
        patch['title'] = meta.title;
    if (missing.includes('authors') && meta.authors?.length)
        patch['authors'] = meta.authors;
    if (missing.includes('year') && meta.year)
        patch['year'] = meta.year;
    if (missing.includes('abstract') && meta.abstract)
        patch['abstract'] = meta.abstract;
    if (Object.keys(patch).length === 0)
        return 'not_found';
    if (!dryRun) {
        await client.updateItem(vaultId, item.id, patch);
    }
    return 'enriched';
}
export function registerEnrich(program) {
    program
        .command('enrich')
        .description('Enrich incomplete publication metadata from Semantic Scholar via DOI')
        .requiredOption('--vault <id>', 'vault to enrich')
        .option('--item <itemId>', 'enrich a single item instead of the whole vault')
        .option('--dry-run', 'show what would be updated without writing')
        .action(async (opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        const dryRun = opts.dryRun ?? false;
        await run(async () => {
            let items;
            if (opts.item) {
                const result = await client.getItem(opts.vault, opts.item);
                items = [result.data];
            }
            else {
                const result = await client.listItems(opts.vault);
                items = result.data;
            }
            const withDoi = items.filter((i) => i.doi);
            if (withDoi.length === 0) {
                process.stdout.write(JSON.stringify({ data: { enriched: 0, skipped: 0, not_found: 0, no_missing_fields: 0, message: 'No items with a DOI found.' } }, null, 2) + '\n');
                return;
            }
            const counts = { enriched: 0, skipped: 0, not_found: 0, no_missing_fields: 0 };
            const enriched = [];
            for (const item of withDoi) {
                const outcome = await enrichItem(item, client, opts.vault, dryRun);
                counts[outcome]++;
                if (outcome === 'enriched')
                    enriched.push(item.id);
                // 1 req/s to respect Semantic Scholar rate limit
                await new Promise((r) => setTimeout(r, 1000));
            }
            process.stdout.write(JSON.stringify({
                data: {
                    dry_run: dryRun,
                    ...counts,
                    enriched_ids: enriched,
                },
            }, null, 2) + '\n');
        });
    });
}
