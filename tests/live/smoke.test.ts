import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/run-cli.js';

// Opt-in checks against the real TVMaze API: TVST_LIVE=1 npm run test:live
const live = (args: string[]) =>
  runCli(args, { apiBase: 'https://api.tvmaze.com', env: { TVST_NOW: undefined, CI: '1' } });

describe.skipIf(!process.env.TVST_LIVE)('live TVMaze API', () => {
  it('searches shows', async () => {
    const data = (await live(['search', 'game of thrones', '--json'])).json<
      Array<{ id: number }>
    >();
    expect(data.map((s) => s.id)).toContain(82);
  });

  it("lists today's US schedule", async () => {
    const result = await live(['schedule', 'today', '--json']);
    expect(result.exitCode).toBe(0);
    expect(result.json<{ count: number }>().count).toBeGreaterThan(0);
  });

  it("lists today's streaming releases", async () => {
    const result = await live(['schedule', '--web', '--json']);
    expect(result.exitCode).toBe(0);
    expect(result.json<{ count: number }>().count).toBeGreaterThan(0);
  });

  it('shows details for a well known show', async () => {
    const result = await live(['info', '--id', '82']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Game of Thrones');
    expect(result.stdout).toContain('Last episode  S08E06');
  });

  it('resolves next and previous episodes', async () => {
    const result = await live(['next', 'game of thrones', '-n', '1', '--json']);
    expect(result.exitCode).toBe(0);
    expect(
      result.json<{ shows: Array<{ previous: { code: string } }> }>().shows[0]?.previous.code,
    ).toBe('S08E06');
  });
});
