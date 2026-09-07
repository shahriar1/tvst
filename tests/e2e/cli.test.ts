import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/run-cli.js';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

describe('tvst', () => {
  it('prints the package version', async () => {
    const { stdout, exitCode } = await runCli(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(pkg.version);
  });

  it('prints help with no arguments and with --help', async () => {
    for (const args of [[], ['--help']]) {
      const { stdout, exitCode } = await runCli(args);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage: tvst [options] [command]');
      for (const cmd of ['schedule', 'next|ne', 'prev|pe', 'search', 'info', 'fav']) {
        expect(stdout).toContain(cmd);
      }
      expect(stdout).not.toContain('fav-add');
    }
  });

  it('rejects unknown commands with a usage error on stderr', async () => {
    const { stdout, stderr, exitCode } = await runCli(['bogus']);
    expect(exitCode).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toContain("unknown command 'bogus'");
    expect(stderr).toContain('tvst --help');
  });

  it('suggests the closest command for a typo', async () => {
    const { stderr, exitCode } = await runCli(['scedule']);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Did you mean schedule?');
  });

  it('shows subcommand help', async () => {
    const { stdout, exitCode } = await runCli(['help', 'fav']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('add [options] [name...]');
    expect(stdout).toContain('upcoming');
  });

  it('reports network failures with exit code 3', async () => {
    const { stderr, exitCode } = await runCli(['search', 'anything'], {
      apiBase: 'http://127.0.0.1:1',
    });
    expect(exitCode).toBe(3);
    expect(stderr).toContain('Could not reach TVMaze');
    expect(stderr).toContain('Check your internet connection');
  });

  it('reports network failures as JSON on stderr with --json', async () => {
    const { stdout, stderr, exitCode } = await runCli(['search', 'anything', '--json']);
    expect(exitCode).toBe(3);
    expect(stdout).toBe('');
    expect(JSON.parse(stderr)).toMatchObject({ code: 3 });
  });
});
