// src/format.ts
import Table from 'cli-table3';
import chalk from 'chalk';
export function format(response, tableMode, columns) {
    if (!tableMode) {
        process.stdout.write(JSON.stringify(response, null, 2) + '\n');
        return;
    }
    const data = response?.data;
    if (!Array.isArray(data) || data.length === 0) {
        process.stdout.write(JSON.stringify(response, null, 2) + '\n');
        return;
    }
    const cols = columns ?? Object.keys(data[0]);
    const table = new Table({
        head: cols.map((c) => chalk.cyan(c)),
    });
    for (const row of data) {
        table.push(cols.map((c) => String(row[c] ?? '')));
    }
    process.stdout.write(table.toString() + '\n');
}
