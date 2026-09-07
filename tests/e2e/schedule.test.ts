import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type FixtureServer, startFixtureServer } from '../helpers/fixture-server.js';
import { runCli } from '../helpers/run-cli.js';

let server: FixtureServer;
const run = (args: string[]) => runCli(args, { apiBase: server.url });

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

describe('tvst schedule', () => {
  it('lists today by default in the US', async () => {
    const { stdout, exitCode } = await run(['schedule']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('TV schedule for Monday, February 1 2016 (US)');
    expect(stdout).toContain('your time zone is America/New_York');
    expect(stdout).toContain('The Bachelor');
    expect(stdout).toContain('Countdown');
    expect(server.hits.at(-1)).toBe('/schedule?country=US&date=2016-02-01');
  });

  it('understands tomorrow, yesterday and ISO dates', async () => {
    expect((await run(['schedule', 'tomorrow'])).stdout).toContain('Tuesday, February 2 2016');
    expect((await run(['schedule', 'yesterday'])).stdout).toContain('Sunday, January 31 2016');
    expect((await run(['schedule', '2016-02-01'])).stdout).toContain('Monday, February 1 2016');
  });

  it('filters by name and shows both network and local time', async () => {
    const { stdout, exitCode } = await run(['schedule', 'today', '-c', 'gb', '-f', 'hardtalk']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('(GB)');
    expect(stdout).toContain('HARDtalk');
    expect(stdout).toContain('BBC News');
    expect(stdout).toMatch(/GMT/);
    expect(stdout).toMatch(/you: .*EST/);
    expect(server.hits.at(-1)).toBe('/schedule?country=GB&date=2016-02-01');
  });

  it('exits 1 when the filter matches nothing', async () => {
    const { stderr, exitCode } = await run(['schedule', '-f', 'zzzzzz']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Nothing matching "zzzzzz"');
  });

  it('exits 1 when the day has no schedule', async () => {
    const { stderr, exitCode } = await run(['schedule', 'friday']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('No TV shows found for 2016-02-05');
  });

  it('rejects a date it cannot parse', async () => {
    const { stderr, exitCode } = await run(['schedule', 'blorp']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Could not understand the date "blorp"');
  });

  it('validates the country code', async () => {
    const { stderr, exitCode } = await run(['schedule', '-c', 'usa']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('two letter ISO country code');
  });

  it('shows streaming releases with --web', async () => {
    const { stdout, exitCode } = await run(['schedule', '--web']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Streaming releases on Monday, February 1 2016');
    expect(server.hits.at(-1)).toBe('/schedule/web?date=2016-02-01');
  });

  it('emits JSON with normalized times', async () => {
    const result = await run(['schedule', '--json', '-f', 'bachelor']);
    expect(result.exitCode).toBe(0);
    const data = result.json<{
      date: string;
      country: string;
      count: number;
      episodes: Array<{
        show: { name: string };
        episode: { code: string };
        airs: { local: string; relative: string };
      }>;
    }>();
    expect(data).toMatchObject({ date: '2016-02-01', country: 'US' });
    expect(data.count).toBeGreaterThan(0);
    const bachelor = data.episodes.find((e) => e.show.name === 'The Bachelor');
    expect(bachelor?.episode.code).toMatch(/^S\d+E\d+$/);
    expect(bachelor?.airs.local).toMatch(/^2016-02-01T20:00:00.000-05:00$/);
    expect(bachelor?.airs.relative).toBe('in 8 hours');
  });

  it('sorts by name when asked', async () => {
    const data = (await run(['schedule', '--json', '--sort', 'name'])).json<{
      episodes: Array<{ show: { name: string } }>;
    }>();
    const names = data.episodes.map((e) => e.show.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
