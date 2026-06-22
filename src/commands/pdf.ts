// src/commands/pdf.ts
import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { RefHubClient, resolveClient, run } from '../client.js';
import { format } from '../format.js';

export async function handlePdfUpload(
  client: RefHubClient,
  vaultId: string,
  itemId: string,
  filePath: string,
  tableMode: boolean,
): Promise<void> {
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = readFileSync(filePath);
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: { code: 'file_read_error', message: `Cannot read file: ${String(e)}` } }) + '\n');
    process.exit(2);
  }
  const result = await client.uploadItemPdf(vaultId, itemId, pdfBuffer);
  format(result, tableMode);
}

export function registerPdf(program: Command): void {
  const pdf = program.command('pdf').description('Upload a PDF to Google Drive for a vault item');

  pdf
    .command('upload')
    .description('Upload a PDF file and link it to a vault item')
    .requiredOption('--vault <id>', 'vault ID')
    .requiredOption('--item <id>', 'vault item ID')
    .requiredOption('--file <path>', 'path to PDF file')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const client = resolveClient(g.apiKey);
      await run(() => handlePdfUpload(client, opts.vault, opts.item, opts.file, g.table ?? false));
    });
}
