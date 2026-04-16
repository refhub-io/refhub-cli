// src/format.ts
import Table from 'cli-table3';
import chalk from 'chalk';

export function format(response: unknown, tableMode: boolean, columns?: string[]): void {
  if (!tableMode) {
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
    return;
  }

  const data = (response as { data?: unknown })?.data;

  if (!Array.isArray(data) || data.length === 0) {
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
    return;
  }

  const cols = columns ?? Object.keys(data[0] as Record<string, unknown>);
  const table = new Table({
    head: cols.map((c) => chalk.cyan(c)),
  });

  for (const row of data) {
    table.push(cols.map((c) => String((row as Record<string, unknown>)[c] ?? '')));
  }

  process.stdout.write(table.toString() + '\n');
}
