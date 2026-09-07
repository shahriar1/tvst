import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type FixtureServer, startFixtureServer } from '../helpers/fixture-server.js';
import { runCli, tempDir } from '../helpers/run-cli.js';

let server: FixtureServer;
let config: ReturnType<typeof tempDir>;
const run = (args: string[], env: Record<string, string> = {}) =>
  runCli(args, { apiBase: server.url, configDir: config.path, env });

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());
beforeEach(() => {
  config = tempDir('tvst-fav-');
});
afterEach(() => config.remove());

describe('tvst fav', () => {
  it('starts empty with a hint', async () => {
    const { stdout, exitCode } = await run(['fav', 'list']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('You have no favorite shows yet.');
    expect(stdout).toContain('tvst fav add <name>');
    expect((await run(['fav', 'list', '--json'])).json()).toMatchObject({ favorites: [] });
  });

  it('adds by id, skips duplicates, and lists offline', async () => {
    const first = await run(['fav', 'add', '--id', '82']);
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toContain('Added Game of Thrones (HBO)');
    expect(first.stdout).toContain(path.join(config.path, 'config.json'));

    const again = await run(['fav', 'add', '--id', '82', '--json']);
    expect(again.json()).toMatchObject({ added: [], skipped: [{ id: 82 }] });

    const list = await run(['fav', 'list', '--offline']);
    expect(list.stdout).toContain('Game of Thrones');
    expect(list.stdout).toContain('HBO');
    expect(server.hits.filter((h) => h.startsWith('/shows/82?'))).toHaveLength(0);
  });

  it('adds the best match with --first', async () => {
    const { stdout, exitCode } = await run(['fav', 'add', 'game', 'of', 'thrones', '--first']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Added Game of Thrones');
  });

  it('refuses to guess between several matches when not interactive', async () => {
    const { stderr, exitCode } = await run(['fav', 'add', 'game of thrones']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Several shows match "game of thrones"');
    expect(stderr).toContain('82  Game of Thrones');
    expect(stderr).toContain('--first');
  });

  it('needs a name when it cannot prompt', async () => {
    const { stderr, exitCode } = await run(['fav', 'add']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Give a show name or --id');
  });

  it('shows next and last episodes for favorites', async () => {
    await run(['fav', 'add', '--id', '82,1371']);
    const { stdout, exitCode } = await run(['fav', 'list']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Your favorite shows');
    expect(stdout).toMatch(
      /Westworld[\s\S]*S01E01 The Original[\s\S]*9:00 PM EDT[\s\S]*in 8 months/,
    );
    expect(stdout).toMatch(/Game of Thrones[\s\S]*none scheduled/);

    const data = (await run(['fav', 'list', '--json'])).json<{
      favorites: Array<{ show: { id: number }; next: { code: string } | null }>;
    }>();
    expect(data.favorites.map((f) => f.show.id)).toEqual([1371, 82]);
    expect(data.favorites[0]?.next?.code).toBe('S01E01');
  });

  it('lists what is coming up within a window', async () => {
    await run(['fav', 'add', '--id', '82,1371']);

    const soon = await run(['fav', 'upcoming']);
    expect(soon.exitCode).toBe(1);
    expect(soon.stderr).toContain('Nothing from your favorites airs in the next 7 days');

    const later = await run(['fav', 'upcoming', '--days', '300']);
    expect(later.exitCode).toBe(0);
    expect(later.stdout).toContain('Coming up in the next 300 days');
    expect(later.stdout).toContain('Sun Oct 2');
    expect(later.stdout).toContain('Westworld');

    const data = (await run(['fav', 'upcoming', '--days', '300', '--json'])).json<{
      days: number;
      episodes: Array<{ show: { name: string }; episode: { code: string } }>;
    }>();
    expect(data.days).toBe(300);
    expect(data.episodes).toHaveLength(1);
    expect(data.episodes[0]).toMatchObject({
      show: { name: 'Westworld' },
      episode: { code: 'S01E01' },
    });
  });

  it('removes by id, by name, or everything', async () => {
    await run(['fav', 'add', '--id', '82,1371']);

    const byName = await run(['fav', 'remove', 'westworld']);
    expect(byName.exitCode).toBe(0);
    expect(byName.stdout).toContain('Removed Westworld');

    const missing = await run(['fav', 'rm', 'nothing-like-this']);
    expect(missing.exitCode).toBe(1);

    const noArgs = await run(['fav', 'remove']);
    expect(noArgs.exitCode).toBe(2);
    expect(noArgs.stderr).toContain('82  Game of Thrones');

    const all = await run(['fav', 'remove', '--all', '--json']);
    expect(all.json()).toMatchObject({ removed: [{ id: 82 }] });
    expect((await run(['fav', 'list', '--json'])).json()).toMatchObject({ favorites: [] });
  });

  it('keeps the fav-add, fav-list and fav-remove commands from 0.x', async () => {
    expect((await run(['fav-add', '--id', '82'])).stdout).toContain('Added Game of Thrones');
    expect((await run(['fav-list', '--offline'])).stdout).toContain('Game of Thrones');
    expect((await run(['fav-remove', '82'])).stdout).toContain('Removed Game of Thrones');
    expect((await run(['fav-list', '--offline'])).stdout).toContain('no favorite shows');
  });

  it('imports favorites saved by tvst 0.x', async () => {
    const legacy = path.join(config.path, 'legacy.json');
    writeFileSync(legacy, JSON.stringify({ favShows: [82] }));
    const { stdout, exitCode } = await run(['fav', 'list', '--offline'], {
      TVST_LEGACY_FAVORITES: legacy,
    });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('#82');
  });
});
