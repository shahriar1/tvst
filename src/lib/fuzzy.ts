/**
 * Loose name matching for `--filter`.
 *
 * A query matches when it is a substring of the name, or when every word of
 * the query matches some word of the name (exactly, as a prefix, or within a
 * small edit distance that grows with the word length). More words in the
 * query therefore means a stricter match.
 */

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Optimal string alignment distance (Levenshtein plus adjacent transpositions). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i += 1) {
    const row: number[] = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    rows.push(row);
  }
  const first = rows[0];
  if (first) for (let j = 0; j <= b.length; j += 1) first[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        (rows[i - 1]?.[j] ?? 0) + 1,
        (rows[i]?.[j - 1] ?? 0) + 1,
        (rows[i - 1]?.[j - 1] ?? 0) + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, (rows[i - 2]?.[j - 2] ?? 0) + 1);
      }
      const row = rows[i];
      if (row) row[j] = best;
    }
  }
  return rows[a.length]?.[b.length] ?? Number.MAX_SAFE_INTEGER;
}

function allowedEdits(length: number): number {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  if (length <= 8) return 2;
  return 3;
}

function wordMatches(queryWord: string, nameWord: string): boolean {
  if (queryWord === nameWord) return true;
  if (queryWord.length >= 3 && nameWord.startsWith(queryWord)) return true;
  return editDistance(queryWord, nameWord) <= allowedEdits(queryWord.length);
}

export function nameMatches(name: string, query: string): boolean {
  const needle = normalize(query);
  if (!needle) return true;
  const haystack = normalize(name);
  if (haystack.includes(needle)) return true;

  const nameWords = haystack.split(' ');
  return needle.split(' ').every((qw) => nameWords.some((nw) => wordMatches(qw, nw)));
}

export function fuzzyFilter<T extends object>(
  items: T[],
  key: keyof T & string,
  query: string,
): T[] {
  if (!normalize(query)) return items;
  return items.filter((item) => nameMatches(String(item[key]), query));
}
