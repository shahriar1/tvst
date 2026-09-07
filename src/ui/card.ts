import type { Episode, Show } from '../api/types.js';
import {
  type AirTime,
  formatLocalTime,
  formatNetworkTime,
  LONG_FORMAT,
  now,
  relativeTime,
  sameZoneAsUser,
} from '../lib/dates.js';
import { episodeCode, networkName, plainText } from '../lib/show.js';
import { terminalWidth } from './table.js';
import { theme } from './theme.js';

const LABEL_WIDTH = 14;

function field(label: string, value: string): string {
  return `  ${theme.label(label.padEnd(LABEL_WIDTH))}${value}`;
}

/** "Game of Thrones · HBO · Ended" */
export function showHeadline(show: Show): string {
  const parts = [networkName(show), show.status].filter(Boolean);
  return `${theme.name(show.name)}${parts.length ? theme.muted(` · ${parts.join(' · ')}`) : ''}`;
}

export function wrap(text: string, width: number, indent = ''): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(indent + line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(indent + line);
  }
  return lines;
}

/** The lines describing when an episode airs, for the detailed cards. */
export function airLines(air: AirTime, verb: 'Airs' | 'Aired'): string[] {
  const lines: string[] = [];
  if (!air.instant) {
    lines.push(field(verb, 'to be announced'));
    return lines;
  }
  if (!air.hasTime) {
    lines.push(
      field(verb, `${formatNetworkTime(air)} ${theme.muted(`· ${relativeTime(air, now())}`)}`),
    );
    return lines;
  }
  if (air.networkZone) {
    lines.push(field('Network time', formatNetworkTime(air, LONG_FORMAT)));
  }
  if (!air.networkZone || !sameZoneAsUser(air)) {
    lines.push(field('Your time', formatLocalTime(air, LONG_FORMAT)));
  }
  lines.push(field(verb === 'Airs' ? 'Countdown' : 'Aired', relativeTime(air, now())));
  return lines;
}

export function episodeCard(
  show: Show,
  episode: Episode,
  air: AirTime,
  kind: 'next' | 'previous',
  options: { headline?: boolean } = {},
): string {
  const lines = options.headline === false ? [] : [showHeadline(show)];
  const title = episode.name ? `"${episode.name}"` : '';
  lines.push(
    field(
      kind === 'next' ? 'Next episode' : 'Last episode',
      `${theme.accent(episodeCode(episode))} ${title}`.trim(),
    ),
  );
  lines.push(...airLines(air, kind === 'next' ? 'Airs' : 'Aired'));
  return lines.join('\n');
}

/** One line summary used for the "ended / nothing scheduled" section. */
export function episodeOneLiner(
  show: Show,
  episode: Episode | undefined,
  air: AirTime | undefined,
): string {
  if (!episode || !air) {
    return `${showHeadline(show)} ${theme.muted('· no episodes on record')}`;
  }
  const when = air.instant ? relativeTime(air, now()) : 'date unknown';
  return `${showHeadline(show)} ${theme.muted(`· last episode ${episodeCode(episode)} aired ${when}`)}`;
}

export function infoCard(show: Show): string {
  const width = Math.min(terminalWidth(), 100);
  const lines: string[] = [];
  const years = show.premiered
    ? `${show.premiered.slice(0, 4)}–${show.ended ? show.ended.slice(0, 4) : ''}`
    : '';
  const facts = [networkName(show), show.type, show.status, years].filter(Boolean);

  lines.push(theme.title(show.name));
  lines.push(theme.muted(facts.join(' · ')));
  lines.push('');

  const runtime = show.averageRuntime ?? show.runtime;
  if (show.genres?.length) lines.push(field('Genres', show.genres.join(', ')));
  if (show.rating?.average) lines.push(field('Rating', `${show.rating.average.toFixed(1)} / 10`));
  if (runtime) lines.push(field('Runtime', `${runtime} min`));
  if (show.language) lines.push(field('Language', show.language));
  if (show.schedule?.days?.length) {
    const time = show.schedule.time ? ` at ${show.schedule.time}` : '';
    lines.push(field('Schedule', `${show.schedule.days.join(', ')}${time}`));
  }
  const network = show.network?.country
    ? `${show.network.name} (${show.network.country.code})`
    : networkName(show);
  if (network) lines.push(field(show.network ? 'Network' : 'Streaming on', network));

  const summary = plainText(show.summary);
  if (summary) {
    lines.push('');
    lines.push(...wrap(summary, width - 2, '  '));
  }
  return lines.join('\n');
}

export function linksBlock(show: Show): string {
  const links = [
    show.url,
    show.officialSite,
    show.externals?.imdb ? `https://www.imdb.com/title/${show.externals.imdb}/` : null,
  ].filter((l): l is string => Boolean(l));
  return links.map((l) => `  ${theme.muted(l)}`).join('\n');
}
