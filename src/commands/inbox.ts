// src/commands/inbox.ts
import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handleInboxList(
  client: RefHubClient,
  opts: { page?: number; limit?: number },
  tableMode: boolean,
): Promise<void> {
  const result = await client.listInbox(opts);
  format(result, tableMode, ['id', 'status', 'source_type', 'source_ref', 'suggested_vault_id', 'created_at']);
}

export async function handleInboxCaptureDoi(client: RefHubClient, doi: string, tableMode: boolean): Promise<void> {
  const result = await client.captureInboxDoi(doi);
  format(result, tableMode);
}

export async function handleInboxCaptureBibtex(client: RefHubClient, bibtex: string, tableMode: boolean): Promise<void> {
  const result = await client.captureInboxBibtex(bibtex);
  format(result, tableMode);
}

export async function handleInboxCaptureManual(client: RefHubClient, title: string, tableMode: boolean): Promise<void> {
  const result = await client.captureInboxManual(title);
  format(result, tableMode);
}

export async function handleInboxAccept(
  client: RefHubClient,
  itemId: string,
  vaultId: string,
  tagsCsv: string | undefined,
  tableMode: boolean,
): Promise<void> {
  const tagIds = tagsCsv ? tagsCsv.split(',').map((t) => t.trim()) : [];
  const result = await client.acceptInboxItem(itemId, vaultId, tagIds);
  format(result, tableMode);
}

export async function handleInboxReject(client: RefHubClient, itemId: string, confirmed: boolean): Promise<void> {
  if (!confirmed) {
    process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge there is no way to un-reject an inbox item.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.rejectInboxItem(itemId);
  format(result, false);
}

export async function handleInboxMerge(client: RefHubClient, itemId: string, confirmed: boolean, tableMode: boolean): Promise<void> {
  if (!confirmed) {
    process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge there is no way to un-merge an inbox item.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.mergeInboxItem(itemId);
  format(result, tableMode);
}

export async function handleInboxPostpone(client: RefHubClient, itemId: string, tableMode: boolean): Promise<void> {
  const result = await client.postponeInboxItem(itemId);
  format(result, tableMode);
}

export async function handleInboxDelete(client: RefHubClient, itemId: string, confirmed: boolean): Promise<void> {
  if (!confirmed) {
    process.stderr.write(JSON.stringify({ error: { code: 'confirm_required', message: 'Pass --confirm to acknowledge this is a hard delete with no undo.' } }) + '\n');
    process.exit(2);
  }
  const result = await client.deleteInboxItem(itemId);
  format(result, false);
}

export function registerInbox(program: Command): void {
  const inbox = program.command('inbox').description('Capture and triage papers before filing them into a vault');

  inbox
    .command('list')
    .description('List pending inbox items')
    .option('--page <n>', 'page number', (v) => parseInt(v, 10))
    .option('--limit <n>', 'results per page (server default 50, max 200)', (v) => parseInt(v, 10))
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxList(client, { page: opts.page, limit: opts.limit }, g.table ?? false));
    });

  const capture = inbox.command('capture').description('Capture a paper into the inbox');

  capture
    .command('doi')
    .description('Capture by DOI')
    .argument('<doi>')
    .action(async (doi, _opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxCaptureDoi(client, doi, g.table ?? false));
    });

  capture
    .command('bibtex')
    .description('Capture from a BibTeX string or file (bulk -- one inbox item per entry)')
    .option('--bibtex <string>', 'inline BibTeX string')
    .option('--file <path>', 'path to .bib file')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      if (!opts.bibtex && !opts.file) {
        process.stderr.write(JSON.stringify({ error: { code: 'missing_input', message: 'Provide --bibtex <string> or --file <path>.' } }) + '\n');
        process.exit(2);
      }
      if (opts.bibtex && opts.file) {
        process.stderr.write(JSON.stringify({ error: { code: 'conflicting_input', message: 'Pass --bibtex <string> or --file <path>, not both.' } }) + '\n');
        process.exit(2);
      }
      let bibtex: string;
      try {
        bibtex = opts.file ? readFileSync(opts.file, 'utf8') : opts.bibtex as string;
      } catch (e) {
        process.stderr.write(JSON.stringify({ error: { code: 'file_read_error', message: `Cannot read file: ${String(e)}` } }) + '\n');
        process.exit(2);
      }
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxCaptureBibtex(client, bibtex, g.table ?? false));
    });

  capture
    .command('manual')
    .description('Capture a manual entry (title only)')
    .requiredOption('--title <title>')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxCaptureManual(client, opts.title, g.table ?? false));
    });

  inbox
    .command('accept')
    .argument('<itemId>')
    .description('File a pending item into a vault')
    .requiredOption('--vault <id>')
    .option('--tags <ids>', 'comma-separated tag IDs to attach')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxAccept(client, itemId, opts.vault, opts.tags, g.table ?? false));
    });

  inbox
    .command('reject')
    .argument('<itemId>')
    .description('Discard a pending item (no undo)')
    .option('--confirm', 'required: acknowledge there is no way to un-reject')
    .action(async (itemId, opts, cmd) => {
      const client = resolveClient(cmd.optsWithGlobals().apiKey);
      await run(() => handleInboxReject(client, itemId, opts.confirm ?? false));
    });

  inbox
    .command('merge')
    .argument('<itemId>')
    .description('File a pending item as a duplicate of the match RefHub already found (no undo)')
    .option('--confirm', 'required: acknowledge there is no way to un-merge')
    .action(async (itemId, opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxMerge(client, itemId, opts.confirm ?? false, g.table ?? false));
    });

  inbox
    .command('postpone')
    .argument('<itemId>')
    .description('Move a pending item to the back of the queue')
    .action(async (itemId, _opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handleInboxPostpone(client, itemId, g.table ?? false));
    });

  inbox
    .command('delete')
    .argument('<itemId>')
    .description('Delete an inbox item regardless of status (hard delete, no undo)')
    .option('--confirm', 'required: acknowledge this is a permanent deletion')
    .action(async (itemId, opts, cmd) => {
      const client = resolveClient(cmd.optsWithGlobals().apiKey);
      await run(() => handleInboxDelete(client, itemId, opts.confirm ?? false));
    });
}
