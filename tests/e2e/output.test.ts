import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type FixtureServer, startFixtureServer } from '../helpers/fixture-server.js';
import { runCli } from '../helpers/run-cli.js';

let server: FixtureServer;

beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`);

describe('output modes', () => {
  it('colors when forced and strips colors with --no-color or NO_COLOR', async () => {
    const colored = await runCli(['search', 'game of thrones', '-n', '1'], {
      apiBase: server.url,
      env: { FORCE_COLOR: '1', NO_COLOR: undefined },
    });
    expect(colored.stdout).toMatch(ANSI);

    const flag = await runCli(['search', 'game of thrones', '-n', '1', '--no-color'], {
      apiBase: server.url,
      env: { FORCE_COLOR: '1', NO_COLOR: undefined },
    });
    expect(flag.stdout).not.toMatch(ANSI);

    const env = await runCli(['search', 'game of thrones', '-n', '1'], {
      apiBase: server.url,
      env: { NO_COLOR: '1' },
    });
    expect(env.stdout).not.toMatch(ANSI);
  });

  it('keeps stdout pure JSON even when colors are forced', async () => {
    const { stdout } = await runCli(['search', 'game of thrones', '-n', '1', '--json'], {
      apiBase: server.url,
      env: { FORCE_COLOR: '1', NO_COLOR: undefined },
    });
    expect(stdout).not.toMatch(ANSI);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });

  it('fits tables to a narrow terminal', async () => {
    const { stdout } = await runCli(['schedule', '-f', 'bachelor'], {
      apiBase: server.url,
      columns: 60,
    });
    for (const line of stdout.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(60);
    }
  });
});
