import { describe, expect, it } from 'vitest';
import { fitColumns, renderTable, truncate } from '../../src/ui/table.js';

describe('truncate', () => {
  it('leaves short strings alone and adds an ellipsis to long ones', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('a fairly long title', 10)).toBe('a fairly …');
  });
});

describe('fitColumns', () => {
  it('uses natural widths when there is room', () => {
    expect(fitColumns(['A', 'Bee'], [['xx', 'y']], 100)).toEqual([4, 5]);
  });

  it('shrinks the widest columns to fit the terminal', () => {
    const widths = fitColumns(['A', 'B'], [['x'.repeat(60), 'y'.repeat(30)]], 60);
    expect(widths.reduce((s, w) => s + w, 0) + 3).toBe(60);
    expect(widths[0]).toBeGreaterThan(widths[1] ?? 0);
    expect(fitColumns(['A', 'B'], [['x'.repeat(60), 'y'.repeat(30)]], 12)).toEqual([10, 10]);
  });
});

describe('renderTable', () => {
  it('wraps long cells instead of overflowing', () => {
    const previous = process.env.COLUMNS;
    process.env.COLUMNS = '40';
    try {
      const out = renderTable({
        head: ['Name', 'Value'],
        rows: [['a very long name that keeps going and going', 'v']],
      });
      for (const line of out.split('\n')) {
        expect(line.length).toBeLessThanOrEqual(40);
      }
    } finally {
      if (previous === undefined) delete process.env.COLUMNS;
      else process.env.COLUMNS = previous;
    }
  });
});
