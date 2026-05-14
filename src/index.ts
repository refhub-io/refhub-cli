// src/index.ts
import { Command } from 'commander';
import { registerVaults } from './commands/vaults.js';
import { registerItems } from './commands/items.js';
import { registerTags } from './commands/tags.js';
import { registerRelations } from './commands/relations.js';
import { registerImport } from './commands/import.js';
import { registerExport } from './commands/export.js';
import { registerAudit } from './commands/audit.js';
import { registerEnrich } from './commands/enrich.js';
import { registerPdf } from './commands/pdf.js';

const program = new Command();

program
  .name('refhub')
  .description('RefHub CLI — manage vaults, items, tags, and relations')
  .version('0.1.0')
  .option('--api-key <key>', 'RefHub API key (overrides REFHUB_API_KEY env var)')
  .option('--jwt <token>', 'Supabase session JWT (overrides REFHUB_JWT env var)')
  .option('--table', 'human-readable table output (default: JSON)');

registerVaults(program);
registerItems(program);
registerTags(program);
registerRelations(program);
registerImport(program);
registerExport(program);
registerAudit(program);
registerEnrich(program);
registerPdf(program);

program.parseAsync();
