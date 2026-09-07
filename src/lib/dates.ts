import * as chrono from 'chrono-node';
import { DateTime } from 'luxon';
import type { Episode, Show } from '../api/types.js';
import { CliError, ExitCode } from './output.js';
import { networkTimezone } from './show.js';

/** Current time in the user's zone. TVST_NOW pins it for reproducible output. */
export function now(): DateTime {
  const override = process.env.TVST_NOW;
  if (override) {
    const pinned = DateTime.fromISO(override, { setZone: true });
    if (pinned.isValid) return pinned.toLocal();
  }
  return DateTime.local();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn a user supplied date ("today", "tomorrow", "next friday", "2026-09-14")
 * into the start of that calendar day in the user's zone.
 */
export function parseDateArg(input: string | undefined, reference: DateTime = now()): DateTime {
  const text = (input ?? '').trim();
  if (!text || /^today$/i.test(text)) return reference.startOf('day');

  if (ISO_DATE.test(text)) {
    const iso = DateTime.fromISO(text, { zone: reference.zone });
    if (iso.isValid) return iso.startOf('day');
  }

  const parsed = chrono.casual.parseDate(text, reference.toJSDate(), { forwardDate: true });
  if (parsed) {
    return DateTime.fromJSDate(parsed, { zone: reference.zone }).startOf('day');
  }

  throw new CliError(
    `Could not understand the date "${text}"`,
    ExitCode.USAGE,
    'Try today, tomorrow, yesterday, "next friday" or a date such as 2026-09-14.',
  );
}

export interface AirTime {
  /** Exact instant the episode airs, or null when TVMaze does not know. */
  instant: DateTime | null;
  /** IANA zone of the broadcasting network; null for global streamers. */
  networkZone: string | null;
  /** False when only the air date (not the time) is known. */
  hasTime: boolean;
}

export function airTimeOf(
  episode: Pick<Episode, 'airstamp' | 'airdate' | 'airtime'>,
  show: Show | undefined,
): AirTime {
  const networkZone = show ? networkTimezone(show) : null;

  if (episode.airstamp) {
    const instant = DateTime.fromISO(episode.airstamp, { setZone: true });
    if (instant.isValid) return { instant, networkZone, hasTime: true };
  }

  if (episode.airdate) {
    if (episode.airtime) {
      const instant = DateTime.fromISO(`${episode.airdate}T${episode.airtime}`, {
        zone: networkZone ?? 'utc',
      });
      if (instant.isValid) return { instant, networkZone, hasTime: true };
    }
    const day = DateTime.fromISO(episode.airdate, { zone: networkZone ?? 'local' });
    if (day.isValid) return { instant: day, networkZone, hasTime: false };
  }

  return { instant: null, networkZone, hasTime: false };
}

export const LONG_FORMAT = 'cccc, LLLL d yyyy, h:mm a ZZZZ';
export const SHORT_TIME = 'h:mm a ZZZZ';
export const DATE_FORMAT = 'ccc, LLL d yyyy';

/** "9:00 PM EST" in the network's own zone, or a sensible placeholder. */
export function formatNetworkTime(air: AirTime, format = SHORT_TIME): string {
  if (!air.instant) return 'TBA';
  if (!air.hasTime) return air.instant.toFormat(DATE_FORMAT);
  if (!air.networkZone) return 'n/a';
  return air.instant.setZone(air.networkZone).toFormat(format);
}

/** The same instant in the user's zone. */
export function formatLocalTime(air: AirTime, format = SHORT_TIME): string {
  if (!air.instant) return 'TBA';
  if (!air.hasTime) return air.instant.toLocal().toFormat(DATE_FORMAT);
  return air.instant.toLocal().toFormat(format);
}

export function userZone(): string {
  return DateTime.local().zoneName ?? 'local';
}

/** True when showing the user's time would just repeat the network time. */
export function sameZoneAsUser(air: AirTime): boolean {
  if (!air.networkZone || !air.instant) return false;
  const local = air.instant.toLocal();
  return local.offset === air.instant.setZone(air.networkZone).offset;
}

/** "in 3 hours", "2 days ago", "tomorrow" ... relative to the reference time. */
export function relativeTime(air: AirTime, reference: DateTime = now()): string {
  if (!air.instant) return 'unknown';
  if (!air.hasTime) {
    return air.instant.toRelativeCalendar({ base: reference }) ?? 'unknown';
  }
  return air.instant.toRelative({ base: reference }) ?? 'unknown';
}

export function toJson(air: AirTime): {
  network: string | null;
  local: string | null;
  utc: string | null;
  networkZone: string | null;
  hasTime: boolean;
} {
  if (!air.instant) {
    return { network: null, local: null, utc: null, networkZone: air.networkZone, hasTime: false };
  }
  return {
    network: air.networkZone ? air.instant.setZone(air.networkZone).toISO() : null,
    local: air.instant.toLocal().toISO(),
    utc: air.instant.toUTC().toISO(),
    networkZone: air.networkZone,
    hasTime: air.hasTime,
  };
}
