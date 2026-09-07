import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Conf from 'conf';

export interface Favorite {
  id: number;
  name: string;
  network: string;
  addedAt: string;
}

interface Schema {
  favorites: Favorite[];
  legacyImported: boolean;
}

export interface FavoriteStore {
  readonly path: string;
  list(): Favorite[];
  has(id: number): boolean;
  add(shows: Array<Pick<Favorite, 'id' | 'name' | 'network'>>): {
    added: Favorite[];
    skipped: Favorite[];
  };
  update(id: number, patch: Partial<Pick<Favorite, 'name' | 'network'>>): void;
  remove(ids: number[]): Favorite[];
  clear(): Favorite[];
}

/** Where tvst 0.x kept its favorites: a JSON file inside the package directory. */
export function legacyFavoritesPath(): string {
  if (process.env.TVST_LEGACY_FAVORITES) return process.env.TVST_LEGACY_FAVORITES;
  return fileURLToPath(new URL('../storage/tvst-fav.json', import.meta.url));
}

function readLegacyIds(file: string): number[] {
  try {
    if (!existsSync(file)) return [];
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { favShows?: unknown };
    if (!Array.isArray(parsed.favShows)) return [];
    return parsed.favShows.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
}

export function createStore(options: { cwd?: string | undefined } = {}): FavoriteStore {
  const cwd = options.cwd ?? process.env.TVST_CONFIG_DIR;
  const conf = new Conf<Schema>({
    projectName: 'tvst',
    projectSuffix: '',
    configName: 'config',
    ...(cwd ? { cwd } : {}),
    defaults: { favorites: [], legacyImported: false },
    schema: {
      favorites: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            network: { type: 'string' },
            addedAt: { type: 'string' },
          },
          required: ['id', 'name', 'network', 'addedAt'],
        },
      },
      legacyImported: { type: 'boolean' },
    },
  });

  const read = (): Favorite[] => conf.get('favorites', []);
  const write = (favorites: Favorite[]) => conf.set('favorites', favorites);

  // One-off import of favorites saved by tvst 0.x (ids only; names are filled in later).
  if (!conf.get('legacyImported', false)) {
    const ids = readLegacyIds(legacyFavoritesPath());
    if (ids.length > 0 && read().length === 0) {
      const addedAt = new Date().toISOString();
      write(ids.map((id) => ({ id, name: '', network: '', addedAt })));
    }
    conf.set('legacyImported', true);
  }

  return {
    path: conf.path,
    list: read,
    has: (id) => read().some((f) => f.id === id),
    add(shows) {
      const current = read();
      const known = new Set(current.map((f) => f.id));
      const added: Favorite[] = [];
      const skipped: Favorite[] = [];
      const addedAt = new Date().toISOString();
      for (const show of shows) {
        const existing = current.find((f) => f.id === show.id);
        if (existing || known.has(show.id)) {
          if (existing) skipped.push(existing);
          continue;
        }
        const favorite = { id: show.id, name: show.name, network: show.network, addedAt };
        current.push(favorite);
        known.add(show.id);
        added.push(favorite);
      }
      write(current);
      return { added, skipped };
    },
    update(id, patch) {
      write(read().map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    remove(ids) {
      const drop = new Set(ids);
      const current = read();
      const removed = current.filter((f) => drop.has(f.id));
      write(current.filter((f) => !drop.has(f.id)));
      return removed;
    },
    clear() {
      const removed = read();
      write([]);
      return removed;
    },
  };
}
