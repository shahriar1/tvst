import Table from 'cli-table3';
import stringWidth from 'string-width';
import { theme } from './theme.js';

export interface TableOptions {
  head: string[];
  rows: Array<Array<string | number>>;
}

const MIN_COLUMN = 10;
const PADDING = 2; // cli-table3 pads one space either side of the content

export function terminalWidth(): number {
  if (process.stdout.columns) return process.stdout.columns;
  const fromEnv = Number(process.env.COLUMNS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 100;
}

export function truncate(text: string, max: number): string {
  if (stringWidth(text) <= max) return text;
  let out = '';
  for (const ch of text) {
    if (stringWidth(out + ch) > max - 1) break;
    out += ch;
  }
  return `${out}…`;
}

function cellWidth(cell: string): number {
  return Math.max(...cell.split('\n').map((line) => stringWidth(line)));
}

/**
 * Natural column widths, shrunk proportionally when the table would not fit
 * the terminal so cli-table3 can word-wrap the widest cells.
 */
export function fitColumns(head: string[], rows: string[][], available: number): number[] {
  const widths = head.map((h, i) => {
    const cells = rows.map((row) => row[i] ?? '');
    return Math.max(cellWidth(h), ...cells.map(cellWidth)) + PADDING;
  });
  const borders = widths.length + 1;
  const excess = widths.reduce((sum, w) => sum + w, 0) + borders - available;
  if (excess <= 0) return widths;

  // Take the overflow out of the columns proportionally to how much slack they have.
  const slack = widths.map((w) => Math.max(0, w - MIN_COLUMN));
  const capacity = slack.reduce((sum, s) => sum + s, 0);
  if (capacity <= excess) return widths.map((w) => Math.min(w, MIN_COLUMN));

  let remaining = excess;
  const fitted = widths.map((w, i) => {
    const cut = Math.floor((excess * (slack[i] ?? 0)) / capacity);
    remaining -= cut;
    return w - cut;
  });
  while (remaining > 0) {
    const widest = fitted.indexOf(Math.max(...fitted));
    fitted[widest] = (fitted[widest] ?? MIN_COLUMN) - 1;
    remaining -= 1;
  }
  return fitted;
}

export function renderTable({ head, rows }: TableOptions): string {
  const cells = rows.map((row) => row.map((cell) => String(cell)));
  const table = new Table({
    head: head.map((h) => theme.heading(h)),
    colWidths: fitColumns(head, cells, terminalWidth()),
    style: { head: [], border: [], compact: false },
    wordWrap: true,
    wrapOnWordBoundary: true,
  });
  for (const row of cells) {
    table.push(row);
  }
  return table.toString();
}
