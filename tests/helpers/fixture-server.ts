import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');

interface Canned {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}
type Step = string | Canned;
type Route = string | (Canned & { sequence?: Step[] });

export interface FixtureServer {
  url: string;
  /** Every request key seen, in order. */
  hits: string[];
  close(): Promise<void>;
}

/** "<pathname>?<decoded query sorted by key then value>", matching routes.json. */
export function routeKey(rawUrl: string): string {
  const url = new URL(rawUrl, 'http://fixture');
  const query = [...url.searchParams.entries()]
    .sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const routes = JSON.parse(
    await readFile(path.join(fixturesDir, 'routes.json'), 'utf8'),
  ) as Record<string, Route>;
  const cursors = new Map<string, number>();
  const hits: string[] = [];

  const resolve = (key: string): Canned | undefined => {
    const route = routes[key];
    if (route === undefined) return undefined;
    if (typeof route === 'string') return { body: route };
    if (route.sequence) {
      const index = cursors.get(key) ?? 0;
      cursors.set(key, index + 1);
      const step = route.sequence[Math.min(index, route.sequence.length - 1)];
      return typeof step === 'string' ? { body: step } : step;
    }
    return route;
  };

  const server: Server = createServer(async (req, res) => {
    const key = routeKey(req.url ?? '/');
    hits.push(key);
    const canned = resolve(key);

    if (!canned) {
      process.stderr.write(`[fixture-server] no fixture for ${key}\n`);
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ name: 'Not Found', message: `no fixture for ${key}`, status: 404 }));
      return;
    }

    let body = canned.body;
    if (typeof body === 'string' && body.endsWith('.json')) {
      body = JSON.parse(await readFile(path.join(fixturesDir, body), 'utf8'));
    }
    res.writeHead(canned.status ?? 200, {
      'content-type': 'application/json',
      ...(canned.headers ?? {}),
    });
    res.end(body === undefined ? '' : JSON.stringify(body));
  });

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    hits,
    close: () => new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
  };
}
