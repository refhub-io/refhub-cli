// src/commands/pdf.ts
import { readFileSync } from 'fs';
import type { Command } from 'commander';
import { resolveManagementClient, run } from '../client.js';
import { format } from '../format.js';

export async function handlePdfUpload(
  mgmt: ManagementClient,
  publicationId: string,
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
  const result = await mgmt.uploadPublicationPdf(publicationId, pdfBuffer);
  format(result, tableMode);
}

export function registerPdf(program: Command): void {
  const pdf = program.command('pdf').description('Upload a PDF to Google Drive for a publication');

  pdf
    .command('upload')
    .description('Upload a PDF file and link it to a publication')
    .requiredOption('--publication <id>', 'publication ID (original_publication_id from vault item)')
    .requiredOption('--file <path>', 'path to PDF file')
    .option('--jwt <token>', 'session JWT (overrides REFHUB_JWT env var)')
    .action(async (opts, cmd) => {
      const g = cmd.optsWithGlobals();
      const mgmt = resolveManagementClient(opts.jwt);
      await run(() => handlePdfUpload(mgmt, opts.publication, opts.file, g.table ?? false));
    });
}
