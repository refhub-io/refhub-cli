import { Command } from 'commander';

const program = new Command();

program
  .name('refhub')
  .description('RefHub CLI — manage vaults, items, tags, and relations')
  .version('0.1.0')
  .option('--api-key <key>', 'RefHub API key (overrides REFHUB_API_KEY env var)')
  .option('--table', 'human-readable table output (default: JSON)');

program.parseAsync();
