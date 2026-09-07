/**
 * Re-record the JSON fixtures used by the offline test-suite from the live TVMaze API.
 *
 *   npm run fixtures:record            # only fixtures that are missing
 *   npm run fixtures:record -- --all   # everything in routes.json
 *
 * Keys in routes.json are "<pathname>?<query>" with decoded, sorted query values,
 * exactly as the fixture server in tests/helpers matches incoming requests.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests/fixtures');
const routesFile = path.join(fixturesDir, 'routes.json');
const baseUrl = 'https://api.tvmaze.com';
const recordAll = process.argv.includes('--all');

type Route = string | { status?: number; body?: unknown; sequence?: unknown[] };

const routes = JSON.parse(await readFile(routesFile, 'utf8')) as Record<string, Route>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

for (const [key, route] of Object.entries(routes)) {
  const targets: string[] = [];
  if (typeof route === 'string') targets.push(route);
  if (typeof route === 'object' && Array.isArray(route.sequence)) {
    for (const step of route.sequence) if (typeof step === 'string') targets.push(step);
  }

  for (const file of targets) {
    const target = path.join(fixturesDir, file);
    if (existsSync(target) && !recordAll) continue;

    const url = new URL(key, baseUrl);
    process.stdout.write(`${url.pathname}${url.search} -> ${file}\n`);
    const response = await fetch(url, { headers: { 'user-agent': 'tvst fixture recorder' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const body = await response.json();
    await writeFile(target, `${JSON.stringify(body, null, 2)}\n`);
    await sleep(600); // stay well under the 20 req / 10 s limit
  }
}
