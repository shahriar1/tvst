import Table from 'cli-table3';
import { theme } from './theme.js';

export interface TableOptions {
  head: string[];
  rows: Array<Array<string | number>>;
  /** Optional fixed column widths; enables word wrapping inside cells. */
  colWidths?: number[];
}

export function terminalWidth(): number {
  return process.stdout.columns ?? 100;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function renderTable({ head, rows, colWidths }: TableOptions): string {
  const table = new Table({
    head: head.map((h) => theme.heading(h)),
    style: { head: [], border: [], compact: false },
    wordWrap: true,
    wrapOnWordBoundary: true,
    ...(colWidths ? { colWidths } : {}),
  });
  for (const row of rows) {
    table.push(row.map((cell) => String(cell)));
  }
  return table.toString();
}
