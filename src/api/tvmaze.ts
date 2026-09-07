import type { Episode, SearchResult, Show } from './types.js';

export const DEFAULT_BASE_URL = 'https://api.tvmaze.com';

export type Embed = 'nextepisode' | 'previousepisode' | 'episodes' | 'cast';

export interface ClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  userAgent?: string;
  /** Maximum number of requests in flight at once. */
  concurrency?: number;
  /** Retries for 429/5xx responses and transport failures. */
  retries?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
  }
}

export class NotFoundError extends ApiError {
  constructor(url: string) {
    super('Not found', 404, url);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends Error {
  readonly url: string;

  constructor(message: string, url: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'NetworkError';
    this.url = url;
  }
}

export type Query = Record<string, string | number | readonly string[] | undefined>;

export interface TvMazeClient {
  readonly baseUrl: string;
  get<T>(path: string, query?: Query): Promise<T>;
  searchShows(query: string): Promise<SearchResult[]>;
  /** Best single match for a query, or null when TVMaze has nothing. */
  singleSearch(query: string, embeds?: Embed[]): Promise<Show | null>;
  show(id: number, embeds?: Embed[]): Promise<Show>;
  episode(id: number): Promise<Episode>;
  schedule(params: { country: string; date: string }): Promise<Episode[]>;
  webSchedule(params: { country?: string | undefined; date: string }): Promise<Episode[]>;
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tiny semaphore so we never hammer the API with dozens of parallel calls. */
function createLimiter(max: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    active -= 1;
    const next = waiting.shift();
    if (next) next();
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

export function buildUrl(baseUrl: string, path: string, query: Query = {}): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function retryDelay(response: Response | undefined, attempt: number): number {
  const header = response?.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  return 500 * 2 ** attempt;
}

export function createClient(options: ClientOptions = {}): TvMazeClient {
  const baseUrl = options.baseUrl ?? process.env.TVST_API_BASE ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const userAgent = options.userAgent ?? 'tvst';
  const retries = options.retries ?? 3;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const sleep = options.sleep ?? defaultSleep;
  const limit = createLimiter(options.concurrency ?? 5);

  async function request(url: string): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      let response: Response | undefined;
      try {
        response = await fetchImpl(url, {
          headers: { accept: 'application/json', 'user-agent': userAgent },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        lastError = error;
      }

      if (response && !RETRYABLE_STATUSES.has(response.status)) {
        return response;
      }
      if (attempt === retries) {
        if (response) return response;
        break;
      }
      await sleep(retryDelay(response, attempt));
    }
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    throw new NetworkError(`Could not reach ${new URL(url).host} (${reason})`, url, lastError);
  }

  async function get<T>(path: string, query?: Query): Promise<T> {
    const url = buildUrl(baseUrl, path, query);
    const response = await limit(() => request(url));
    if (response.status === 404) throw new NotFoundError(url);
    if (!response.ok) {
      throw new ApiError(`TVMaze responded with HTTP ${response.status}`, response.status, url);
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError('TVMaze returned a response that is not valid JSON', response.status, url);
    }
  }

  function embedQuery(embeds: Embed[] | undefined): Query {
    return embeds && embeds.length > 0 ? { 'embed[]': embeds } : {};
  }

  return {
    baseUrl,
    get,
    searchShows(query) {
      return get<SearchResult[]>('search/shows', { q: query });
    },
    async singleSearch(query, embeds) {
      try {
        return await get<Show>('singlesearch/shows', { q: query, ...embedQuery(embeds) });
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        throw error;
      }
    },
    show(id, embeds) {
      return get<Show>(`shows/${id}`, embedQuery(embeds));
    },
    episode(id) {
      return get<Episode>(`episodes/${id}`);
    },
    schedule({ country, date }) {
      return get<Episode[]>('schedule', { country, date });
    },
    webSchedule({ country, date }) {
      return get<Episode[]>('schedule/web', { date, country });
    },
  };
}
