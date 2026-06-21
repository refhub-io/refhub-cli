import { resolveClient, run } from '../client.js';
import { format } from '../format.js';
export async function handleVaultsList(client, tableMode) {
    const result = await client.listVaults();
    format(result, tableMode, ['id', 'name', 'visibility', 'item_count', 'updated_at']);
}
export async function handleVaultGet(client, vaultId, tableMode) {
    const result = await client.getVault(vaultId);
    format(result, tableMode);
}
export async function handleVaultCreate(client, opts, tableMode) {
    const body = { name: opts.name };
    if (opts.description)
        body['description'] = opts.description;
    if (opts.color)
        body['color'] = opts.color;
    if (opts.visibility)
        body['visibility'] = opts.visibility;
    if (opts.category)
        body['category'] = opts.category;
    if (opts.abstract)
        body['abstract'] = opts.abstract;
    const result = await client.createVault(body);
    format(result, tableMode);
}
export async function handleVaultUpdate(client, vaultId, opts, tableMode) {
    const body = {};
    if (opts.name)
        body['name'] = opts.name;
    if (opts.description)
        body['description'] = opts.description;
    if (opts.color)
        body['color'] = opts.color;
    if (opts.category)
        body['category'] = opts.category;
    if (opts.abstract)
        body['abstract'] = opts.abstract;
    const result = await client.updateVault(vaultId, body);
    format(result, tableMode);
}
export async function handleVaultDelete(client, vaultId, confirmed) {
    if (!confirmed) {
        process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge this is a hard delete with no undo.' } }) + '\n');
        process.exit(2);
    }
    const result = await client.deleteVault(vaultId);
    format(result, false);
}
export async function handleVaultVisibility(client, vaultId, opts, tableMode) {
    const body = { visibility: opts.visibility };
    if (opts.slug)
        body.public_slug = opts.slug;
    const result = await client.setVaultVisibility(vaultId, body);
    format(result, tableMode);
}
export async function handleSharesList(client, vaultId, tableMode) {
    const result = await client.listShares(vaultId);
    format(result, tableMode, ['id', 'email', 'role', 'name']);
}
export async function handleShareAdd(client, vaultId, opts, tableMode) {
    const result = await client.addShare(vaultId, opts);
    format(result, tableMode);
}
export async function handleShareUpdate(client, vaultId, shareId, role, tableMode) {
    const result = await client.updateShare(vaultId, shareId, { role });
    format(result, tableMode);
}
export async function handleShareRemove(client, vaultId, shareId) {
    const result = await client.removeShare(vaultId, shareId);
    format(result, false);
}
export function registerVaults(program) {
    const vaults = program.command('vaults').description('Manage vaults');
    vaults
        .command('list')
        .description('List all accessible vaults')
        .action(async (opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleVaultsList(client, g.table ?? false));
    });
    vaults
        .command('get')
        .argument('<vaultId>')
        .description('Read one vault with full contents')
        .action(async (vaultId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleVaultGet(client, vaultId, g.table ?? false));
    });
    vaults
        .command('create')
        .description('Create a vault')
        .requiredOption('--name <name>', 'vault name')
        .option('--description <desc>')
        .option('--color <color>')
        .option('--visibility <visibility>', 'private|protected|public')
        .option('--category <category>')
        .option('--abstract <abstract>')
        .action(async (opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleVaultCreate(client, opts, g.table ?? false));
    });
    vaults
        .command('update')
        .argument('<vaultId>')
        .description('Update vault metadata')
        .option('--name <name>')
        .option('--description <desc>')
        .option('--color <color>')
        .option('--category <category>')
        .option('--abstract <abstract>')
        .action(async (vaultId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleVaultUpdate(client, vaultId, opts, g.table ?? false));
    });
    vaults
        .command('delete')
        .argument('<vaultId>')
        .description('Delete a vault (hard delete, no undo)')
        .option('--confirm', 'required: acknowledge this is a permanent deletion')
        .action(async (vaultId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleVaultDelete(client, vaultId, opts.confirm ?? false));
    });
    vaults
        .command('visibility')
        .argument('<vaultId>')
        .description('Set vault visibility')
        .requiredOption('--visibility <visibility>', 'private|protected|public')
        .option('--slug <slug>', 'public_slug for public vaults')
        .action(async (vaultId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleVaultVisibility(client, vaultId, { visibility: opts.visibility, slug: opts.slug }, g.table ?? false));
    });
    const shares = vaults.command('shares').description('Manage vault collaborators');
    shares
        .command('list')
        .argument('<vaultId>')
        .description('List vault collaborators')
        .action(async (vaultId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleSharesList(client, vaultId, g.table ?? false));
    });
    shares
        .command('add')
        .argument('<vaultId>')
        .description('Add a collaborator')
        .requiredOption('--email <email>')
        .requiredOption('--role <role>', 'viewer|editor')
        .option('--name <name>')
        .action(async (vaultId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleShareAdd(client, vaultId, { email: opts.email, role: opts.role, name: opts.name }, g.table ?? false));
    });
    shares
        .command('update')
        .argument('<vaultId>')
        .argument('<shareId>')
        .description('Update a collaborator role')
        .requiredOption('--role <role>', 'viewer|editor')
        .action(async (vaultId, shareId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleShareUpdate(client, vaultId, shareId, opts.role, g.table ?? false));
    });
    shares
        .command('remove')
        .argument('<vaultId>')
        .argument('<shareId>')
        .description('Remove a collaborator')
        .action(async (vaultId, shareId, opts, cmd) => {
        const g = cmd.optsWithGlobals();
        const client = resolveClient(g.apiKey);
        await run(() => handleShareRemove(client, vaultId, shareId));
    });
}
