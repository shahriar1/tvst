import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type FixtureServer, startFixtureServer } from '../helpers/fixture-server.js';
import { runCli } from '../helpers/run-cli.js';

let server: FixtureServer;
const run = (args: string[]) => runCli(args, { apiBase: server.url });

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

describe('tvst next / prev', () => {
  it('accepts an unquoted multi-word name and lists ended shows compactly', async () => {
    const { stdout, exitCode } = await run(['next', 'game', 'of', 'thrones', '-n', '2']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No upcoming episode is scheduled');
    expect(stdout).toContain('Ended or nothing scheduled yet:');
    expect(stdout).toContain('Game of Thrones · HBO · Ended · last episode S08E06');
    expect(stdout).toContain('Game of Thrones: Inside the Episode');
    expect(server.hits.filter((h) => h.startsWith('/shows/'))).toHaveLength(2);
  });

  it('prints a full card for a show with an upcoming episode', async () => {
    const { stdout, exitCode } = await run(['next', 'westworld', '-n', '1']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Westworld · HBO · In Development');
    expect(stdout).toContain('Next episode  S01E01 "The Original"');
    expect(stdout).toContain('Network time  Sunday, October 2 2016, 9:00 PM EDT');
    expect(stdout).toContain('Countdown     in 8 months');
    expect(stdout).not.toContain('Your time');
  });

  it('keeps the ne alias', async () => {
    const { stdout, exitCode } = await run(['ne', 'westworld', '-n', '1']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Next episode  S01E01');
  });

  it('shows the last aired episode with prev and pe', async () => {
    for (const cmd of ['prev', 'pe']) {
      const { stdout, exitCode } = await run([cmd, 'game of thrones', '-n', '1']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Game of Thrones · HBO · Ended');
      expect(stdout).toContain('Last episode  S08E06 "The Iron Throne"');
      expect(stdout).toContain('Network time  Sunday, May 19 2019, 9:00 PM EDT');
      expect(stdout).toContain('Aired         in 3 years');
    }
  });

  it('exits 1 when nothing matches', async () => {
    const { stderr, exitCode } = await run(['next', 'zzqqzz']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('No show found matching "zzqqzz"');
  });

  it('emits JSON with next and previous episodes', async () => {
    const data = (await run(['next', 'westworld', '-n', '1', '--json'])).json<{
      query: string;
      shows: Array<{
        show: { id: number };
        next: { code: string; airs: { utc: string } } | null;
        previous: unknown;
      }>;
    }>();
    expect(data.query).toBe('westworld');
    expect(data.shows[0]?.show.id).toBe(1371);
    expect(data.shows[0]?.next?.code).toBe('S01E01');
    expect(data.shows[0]?.next?.airs.utc).toBe('2016-10-03T01:00:00.000Z');
    expect(data.shows[0]?.previous).toBeNull();
  });
});

describe('tvst search / info', () => {
  it('lists matches in a table', async () => {
    const { stdout, exitCode } = await run(['search', 'game of thrones', '-n', '2']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Shows matching "game of thrones"');
    expect(stdout).toMatch(
      /82\s+│\s+Game of Thrones\s+│\s+HBO\s+│\s+US\s+│\s+Ended\s+│\s+2011-04-17/,
    );
    expect(stdout).not.toContain('Hip Hop Tribe');
  });

  it('emits JSON summaries', async () => {
    const data = (await run(['search', 'game of thrones', '--json', '-n', '1'])).json<
      Array<{ id: number; network: string; timezone: string }>
    >();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ id: 82, network: 'HBO', timezone: 'America/New_York' });
  });

  it('prints a detail card for the best match', async () => {
    const { stdout, exitCode } = await run(['info', 'game of thrones']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Game of Thrones');
    expect(stdout).toContain('HBO · Scripted · Ended · 2011–2019');
    expect(stdout).toContain('Genres        Drama, Adventure, Fantasy');
    expect(stdout).toContain('A Song of Ice and Fire');
    expect(stdout).toContain('Last episode  S08E06 "The Iron Throne"');
    expect(stdout).toContain('https://www.imdb.com/title/tt0944947/');
    expect(stdout).toContain('tvst fav add --id 82');
  });

  it('looks up by id and survives a 429 on the way', async () => {
    const { stdout, exitCode } = await run(['info', '--id', '1']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Under the Dome');
    expect(server.hits.filter((h) => h.startsWith('/shows/1?'))).toHaveLength(2);
  });

  it('exits 1 when there is no such show', async () => {
    const byName = await run(['info', 'zzqqzz']);
    expect(byName.exitCode).toBe(1);
    expect(byName.stderr).toContain('No show found matching "zzqqzz"');

    const byId = await run(['info', '--id', '9999999']);
    expect(byId.exitCode).toBe(1);
    expect(byId.stderr).toContain('No show found matching show #9999999');
  });

  it('needs a name or an id', async () => {
    const { stderr, exitCode } = await run(['info']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Give a show name or --id');
  });
});
