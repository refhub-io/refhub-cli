import { resolveClient, run } from '../client.js';
export async function handleExport(client, vaultId, outputFormat) {
    const raw = await client.exportVault(vaultId, outputFormat);
    process.stdout.write(raw + '\n');
}
export function registerExport(program) {
    program
        .command('export')
        .description('Export a vault as JSON or BibTeX')
        .requiredOption('--vault <id>')
        .option('--format <format>', 'json|bibtex', 'json')
        .action(async (opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        if (opts.format !== 'json' && opts.format !== 'bibtex') {
            process.stderr.write(JSON.stringify({ error: { code: 'invalid_format', message: `Unknown format '${opts.format}'. Use json or bibtex.` } }) + '\n');
            process.exit(2);
        }
        const fmt = opts.format;
        await run(() => handleExport(client, opts.vault, fmt));
    });
}
