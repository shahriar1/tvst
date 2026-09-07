import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

export const cliPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../dist/cli.js',
);

export interface RunOptions {
  apiBase?: string;
  configDir?: string;
  env?: Record<string, string | undefined>;
  columns?: number;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  json<T = unknown>(): T;
}

export function tempDir(prefix = 'tvst-e2e-'): { path: string; remove(): void } {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  return { path: dir, remove: () => rmSync(dir, { recursive: true, force: true }) };
}

export async function runCli(args: string[], options: RunOptions = {}): Promise<RunResult> {
  const result = await execa(process.execPath, [cliPath, ...args], {
    reject: false,
    stdin: 'ignore',
    env: {
      TZ: 'America/New_York',
      NO_COLOR: '1',
      CI: '1',
      TVST_NOW: '2016-02-01T12:00:00-05:00',
      COLUMNS: String(options.columns ?? 140),
      TVST_API_BASE: options.apiBase ?? 'http://127.0.0.1:1',
      TVST_CONFIG_DIR: options.configDir ?? tempDir().path,
      TVST_LEGACY_FAVORITES: '/nonexistent/tvst-fav.json',
      ...options.env,
    },
  });
  const stdout = String(result.stdout ?? '');
  const stderr = String(result.stderr ?? '');
  return {
    stdout,
    stderr,
    exitCode: result.exitCode ?? -1,
    json: <T>() => JSON.parse(stdout) as T,
  };
}
