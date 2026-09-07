import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStore } from '../../src/lib/store.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'tvst-store-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.TVST_LEGACY_FAVORITES;
});

const got = { id: 82, name: 'Game of Thrones', network: 'HBO' };
const bear = { id: 41007, name: 'The Bear', network: 'Hulu' };

describe('createStore', () => {
  it('starts empty and persists to the given directory', () => {
    const store = createStore({ cwd: dir });
    expect(store.list()).toEqual([]);
    expect(store.path.startsWith(dir)).toBe(true);
    store.add([got]);
    expect(createStore({ cwd: dir }).list()).toMatchObject([got]);
  });

  it('adds with union semantics', () => {
    const store = createStore({ cwd: dir });
    expect(store.add([got, bear]).added).toHaveLength(2);
    const again = store.add([got, { id: 1, name: 'Under the Dome', network: 'CBS' }]);
    expect(again.added.map((f) => f.id)).toEqual([1]);
    expect(again.skipped.map((f) => f.id)).toEqual([82]);
    expect(store.list().map((f) => f.id)).toEqual([82, 41007, 1]);
  });

  it('removes by id and reports what went', () => {
    const store = createStore({ cwd: dir });
    store.add([got, bear]);
    expect(store.remove([82, 999]).map((f) => f.id)).toEqual([82]);
    expect(store.has(82)).toBe(false);
    expect(store.has(41007)).toBe(true);
    expect(store.clear().map((f) => f.id)).toEqual([41007]);
    expect(store.list()).toEqual([]);
  });

  it('updates cached names', () => {
    const store = createStore({ cwd: dir });
    store.add([{ id: 5, name: '', network: '' }]);
    store.update(5, { name: 'Fresh', network: 'NBC' });
    expect(store.list()[0]).toMatchObject({ id: 5, name: 'Fresh', network: 'NBC' });
  });

  it('imports favorites saved by tvst 0.x once', () => {
    const legacy = path.join(dir, 'tvst-fav.json');
    writeFileSync(legacy, JSON.stringify({ favShows: [82, 11964, 'bogus'] }));
    process.env.TVST_LEGACY_FAVORITES = legacy;

    const store = createStore({ cwd: dir });
    expect(store.list().map((f) => f.id)).toEqual([82, 11964]);

    store.clear();
    expect(createStore({ cwd: dir }).list()).toEqual([]);
  });
});
