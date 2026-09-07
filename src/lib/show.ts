import type { Episode, Show } from '../api/types.js';

export function networkName(show: Show): string {
  return show.network?.name ?? show.webChannel?.name ?? '';
}

export function networkKind(show: Show): 'network' | 'web' | 'unknown' {
  if (show.network) return 'network';
  if (show.webChannel) return 'web';
  return 'unknown';
}

export function countryCode(show: Show): string {
  return show.network?.country?.code ?? show.webChannel?.country?.code ?? '';
}

/** IANA timezone the show's network broadcasts in; null for global streamers. */
export function networkTimezone(show: Show): string | null {
  return show.network?.country?.timezone ?? show.webChannel?.country?.timezone ?? null;
}

export function episodeCode(episode: Pick<Episode, 'season' | 'number'>): string {
  const season = String(episode.season).padStart(2, '0');
  if (episode.number === null || episode.number === undefined) return `S${season}`;
  return `S${season}E${String(episode.number).padStart(2, '0')}`;
}

/** Strip the light HTML TVMaze uses in summaries. */
export function plainText(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function idFromHref(href: string | undefined): number | undefined {
  if (!href) return undefined;
  const match = /\/(\d+)(?:\?.*)?$/.exec(href);
  return match?.[1] ? Number(match[1]) : undefined;
}

/** Compact, stable JSON representation of a show. */
export interface ShowSummary {
  id: number;
  name: string;
  type: string;
  status: string;
  network: string;
  networkKind: 'network' | 'web' | 'unknown';
  country: string;
  timezone: string | null;
  premiered: string | null;
  ended: string | null;
  genres: string[];
  rating: number | null;
  runtime: number | null;
  language: string | null;
  officialSite: string | null;
  url: string;
  imdb: string | null;
}

export function toShowSummary(show: Show): ShowSummary {
  return {
    id: show.id,
    name: show.name,
    type: show.type,
    status: show.status,
    network: networkName(show),
    networkKind: networkKind(show),
    country: countryCode(show),
    timezone: networkTimezone(show),
    premiered: show.premiered,
    ended: show.ended,
    genres: show.genres ?? [],
    rating: show.rating?.average ?? null,
    runtime: show.runtime ?? show.averageRuntime ?? null,
    language: show.language,
    officialSite: show.officialSite,
    url: show.url,
    imdb: show.externals?.imdb ?? null,
  };
}
