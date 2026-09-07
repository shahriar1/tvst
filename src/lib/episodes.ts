import type { Episode, Show } from '../api/types.js';
import { type AirTime, airTimeOf, now, relativeTime, toJson } from './dates.js';
import { episodeCode } from './show.js';

export interface EpisodeJson {
  id: number;
  name: string;
  season: number;
  number: number | null;
  code: string;
  type: string;
  airdate: string;
  airtime: string;
  airstamp: string | null;
  runtime: number | null;
  summary: string | null;
  url: string;
  airs: ReturnType<typeof toJson> & { relative: string };
}

export function episodeJson(episode: Episode, show: Show | undefined): EpisodeJson {
  const air = airTimeOf(episode, show);
  return {
    id: episode.id,
    name: episode.name,
    season: episode.season,
    number: episode.number,
    code: episodeCode(episode),
    type: episode.type,
    airdate: episode.airdate,
    airtime: episode.airtime,
    airstamp: episode.airstamp,
    runtime: episode.runtime,
    summary: episode.summary,
    url: episode.url,
    airs: { ...toJson(air), relative: relativeTime(air, now()) },
  };
}

export interface ShowEpisodes {
  show: Show;
  next: Episode | undefined;
  previous: Episode | undefined;
  nextAir: AirTime | undefined;
  previousAir: AirTime | undefined;
}

/** Pull the embedded next/previous episodes out of a `/shows/:id?embed[]=...` payload. */
export function splitEpisodes(show: Show): ShowEpisodes {
  const next = show._embedded?.nextepisode;
  const previous = show._embedded?.previousepisode;
  return {
    show,
    next,
    previous,
    nextAir: next ? airTimeOf(next, show) : undefined,
    previousAir: previous ? airTimeOf(previous, show) : undefined,
  };
}
