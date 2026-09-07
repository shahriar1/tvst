import { describe, expect, it } from 'vitest';
import {
  ApiError,
  buildUrl,
  createClient,
  NetworkError,
  NotFoundError,
} from '../../src/api/tvmaze.js';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });

const noSleep = async () => {};

describe('buildUrl', () => {
  it('encodes repeated embed params and spaces', () => {
    const url = buildUrl('https://api.tvmaze.com', 'shows/82', {
      'embed[]': ['nextepisode', 'previousepisode'],
    });
    expect(url).toBe(
      'https://api.tvmaze.com/shows/82?embed%5B%5D=nextepisode&embed%5B%5D=previousepisode',
    );
    expect(buildUrl('https://api.tvmaze.com', 'search/shows', { q: 'game of thrones' })).toBe(
      'https://api.tvmaze.com/search/shows?q=game+of+thrones',
    );
  });

  it('skips undefined query values', () => {
    expect(
      buildUrl('http://127.0.0.1:1', 'schedule/web', { date: '2016-02-01', country: undefined }),
    ).toBe('http://127.0.0.1:1/schedule/web?date=2016-02-01');
  });
});

describe('createClient', () => {
  it('parses JSON responses', async () => {
    const client = createClient({
      baseUrl: 'https://example.test',
      fetch: async () => json({ id: 82, name: 'Game of Thrones' }),
    });
    await expect(client.show(82)).resolves.toMatchObject({ id: 82 });
  });

  it('retries on 429 and honours retry-after', async () => {
    const seen: string[] = [];
    const delays: number[] = [];
    let calls = 0;
    const client = createClient({
      baseUrl: 'https://example.test',
      sleep: async (ms) => {
        delays.push(ms);
      },
      fetch: async (input) => {
        seen.push(String(input));
        calls += 1;
        if (calls === 1) return new Response('', { status: 429, headers: { 'retry-after': '2' } });
        return json([{ score: 1, show: { id: 1 } }]);
      },
    });
    const results = await client.searchShows('x');
    expect(results).toHaveLength(1);
    expect(calls).toBe(2);
    expect(delays).toEqual([2000]);
    expect(seen[0]).toContain('/search/shows?q=x');
  });

  it('gives up after the configured retries', async () => {
    let calls = 0;
    const client = createClient({
      baseUrl: 'https://example.test',
      retries: 2,
      sleep: noSleep,
      fetch: async () => {
        calls += 1;
        return new Response('', { status: 503 });
      },
    });
    await expect(client.show(1)).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(3);
  });

  it('maps 404 to NotFoundError and singleSearch to null', async () => {
    const client = createClient({
      baseUrl: 'https://example.test',
      fetch: async () => new Response('{"name":"Not Found"}', { status: 404 }),
    });
    await expect(client.show(999)).rejects.toBeInstanceOf(NotFoundError);
    await expect(client.singleSearch('zzz')).resolves.toBeNull();
  });

  it('wraps transport failures in NetworkError', async () => {
    const client = createClient({
      baseUrl: 'https://example.test',
      retries: 1,
      sleep: noSleep,
      fetch: async () => {
        throw new TypeError('fetch failed');
      },
    });
    await expect(client.episode(1)).rejects.toBeInstanceOf(NetworkError);
  });

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const client = createClient({
      baseUrl: 'https://example.test',
      concurrency: 3,
      fetch: async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return json({ id: 1 });
      },
    });
    await Promise.all(Array.from({ length: 12 }, (_, i) => client.show(i)));
    expect(peak).toBe(3);
  });

  it('honours TVST_API_BASE when no base url is given', () => {
    const previous = process.env.TVST_API_BASE;
    process.env.TVST_API_BASE = 'http://127.0.0.1:4321';
    try {
      expect(createClient().baseUrl).toBe('http://127.0.0.1:4321');
    } finally {
      if (previous === undefined) delete process.env.TVST_API_BASE;
      else process.env.TVST_API_BASE = previous;
    }
  });
});
