/**
 * Subset of the TVMaze API payloads that tvst relies on.
 * See https://www.tvmaze.com/api
 */

export interface Country {
  name: string;
  code: string;
  timezone: string;
}

export interface Network {
  id: number;
  name: string;
  country: Country | null;
  officialSite?: string | null;
}

export interface WebChannel {
  id: number;
  name: string;
  country: Country | null;
  officialSite?: string | null;
}

export interface Image {
  medium: string;
  original: string;
}

export interface Link {
  href: string;
  name?: string;
}

export interface ShowSchedule {
  time: string;
  days: string[];
}

export interface Show {
  id: number;
  url: string;
  name: string;
  type: string;
  language: string | null;
  genres: string[];
  status: string;
  runtime: number | null;
  averageRuntime: number | null;
  premiered: string | null;
  ended: string | null;
  officialSite: string | null;
  schedule: ShowSchedule;
  rating: { average: number | null };
  weight: number;
  network: Network | null;
  webChannel: WebChannel | null;
  externals: { tvrage: number | null; thetvdb: number | null; imdb: string | null };
  image: Image | null;
  summary: string | null;
  updated: number;
  _links: {
    self: Link;
    previousepisode?: Link;
    nextepisode?: Link;
  };
  _embedded?: {
    nextepisode?: Episode;
    previousepisode?: Episode;
  };
}

export interface Episode {
  id: number;
  url: string;
  name: string;
  season: number;
  number: number | null;
  type: string;
  airdate: string;
  /** "HH:mm" in the network's local time, or "" when unknown */
  airtime: string;
  /** ISO 8601 instant, or null when unknown */
  airstamp: string | null;
  runtime: number | null;
  rating: { average: number | null };
  image: Image | null;
  summary: string | null;
  _links: {
    self: Link;
    show?: Link;
  };
  /** Present on /schedule entries */
  show?: Show;
  /** Present on /schedule/web entries */
  _embedded?: {
    show?: Show;
  };
}

export interface SearchResult {
  score: number;
  show: Show;
}

export type ScheduleEntry = Episode;

/** Resolve the show attached to a schedule entry regardless of which endpoint produced it. */
export function showOf(entry: ScheduleEntry): Show | undefined {
  return entry.show ?? entry._embedded?.show;
}
