import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Episode } from '../../src/api/types.js';
import { showOf } from '../../src/api/types.js';
import { editDistance, fuzzyFilter, nameMatches } from '../../src/lib/fuzzy.js';

const schedule = JSON.parse(
  readFileSync(new URL('../fixtures/schedule-us-2016-02-01.json', import.meta.url), 'utf8'),
) as Episode[];

const shows = [...new Set(schedule.map((entry) => showOf(entry)?.name).filter(Boolean))].map(
  (name) => ({ name: name as string }),
);
const names = (query: string) => fuzzyFilter(shows, 'name', query).map((s) => s.name);

describe('editDistance', () => {
  it('counts substitutions, insertions, deletions and transpositions', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('bachelr', 'bachelor')).toBe(1);
    expect(editDistance('recieve', 'receive')).toBe(1);
    expect(editDistance('', 'abc')).toBe(3);
  });
});

describe('fuzzyFilter', () => {
  it('returns everything for an empty query', () => {
    expect(fuzzyFilter(shows, 'name', '  ')).toHaveLength(shows.length);
  });

  it('matches a single word', () => {
    const result = names('bachelor');
    expect(result).toEqual(['The Bachelor', 'The Bachelor Live']);
  });

  it('tolerates typos in longer words', () => {
    expect(names('bachelr')).toContain('The Bachelor');
    expect(names('supergril')).toContain('Supergirl');
  });

  it('does not let short words match loosely', () => {
    expect(names('raw')).toEqual([]);
  });

  it('gets stricter with more words', () => {
    expect(names('house hunters')).toEqual(['House Hunters', 'House Hunters International']);
    expect(names('house hunters international')).toEqual(['House Hunters International']);
    expect(names('nfl monday')).toEqual(['NFL Monday QB']);
  });

  it('ignores case, punctuation and accents', () => {
    expect(names('DRAG race')).toEqual(["RuPaul's Drag Race: RuVealed", "RuPaul's Drag Race"]);
    expect(names('quien es quien')).toEqual(['¿Quién es quién?']);
    expect(nameMatches("Fast N' Loud", 'fast n loud')).toBe(true);
  });
});
