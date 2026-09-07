import type { Command } from 'commander';
import { InvalidArgumentError } from 'commander';
import type { Episode, Show } from '../api/types.js';
import { showOf } from '../api/types.js';
import { buildContext, type Context } from '../lib/context.js';
import {
  airTimeOf,
  formatLocalTime,
  formatNetworkTime,
  now,
  parseDateArg,
  relativeTime,
  sameZoneAsUser,
  toJson,
  userZone,
} from '../lib/dates.js';
import { fuzzyFilter } from '../lib/fuzzy.js';
import { CliError, ExitCode, printJson, println } from '../lib/output.js';
import { episodeCode, networkName, toShowSummary } from '../lib/show.js';
import { withSpinner } from '../ui/spinner.js';
import { renderTable, truncate } from '../ui/table.js';
import { theme } from '../ui/theme.js';

interface ScheduleOptions {
  country?: string;
  filter?: string;
  web?: boolean;
  sort: 'time' | 'name';
}

interface Row {
  show: Show;
  episode: Episode;
}

function parseSort(value: string): 'time' | 'name' {
  if (value === 'time' || value === 'name') return value;
  throw new InvalidArgumentError('expected "time" or "name"');
}

function parseCountry(value: string): string {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    throw new InvalidArgumentError('expected a two letter ISO country code such as US or GB');
  }
  return code;
}

export async function runSchedule(
  ctx: Context,
  dateInput: string | undefined,
  opts: ScheduleOptions,
): Promise<void> {
  const day = parseDateArg(dateInput);
  const date = day.toISODate() ?? day.toFormat('yyyy-LL-dd');
  const web = opts.web === true;
  const country = web ? opts.country : (opts.country ?? 'US');

  const label = web
    ? `streaming releases on ${day.toFormat('cccc, LLLL d yyyy')}${country ? ` (${country})` : ''}`
    : `TV schedule for ${day.toFormat('cccc, LLLL d yyyy')} (${country})`;

  const entries = await withSpinner(ctx, `Loading ${label}`, () =>
    web
      ? ctx.client.webSchedule({ date, country })
      : ctx.client.schedule({ date, country: country ?? 'US' }),
  );

  let rows: Row[] = entries.flatMap((episode) => {
    const show = showOf(episode);
    return show ? [{ show, episode }] : [];
  });

  if (rows.length === 0) {
    throw new CliError(
      `No ${web ? 'streaming releases' : 'TV shows'} found for ${date}.`,
      ExitCode.NO_RESULTS,
    );
  }

  if (opts.filter) {
    const named = rows.map((row) => ({ name: row.show.name, row }));
    rows = fuzzyFilter(named, 'name', opts.filter).map((entry) => entry.row);
    if (rows.length === 0) {
      throw new CliError(
        `Nothing matching "${opts.filter}" in the ${label}.`,
        ExitCode.NO_RESULTS,
        'Try a shorter filter or check the spelling.',
      );
    }
  }

  const reference = now();
  const timed = rows.map((row) => ({ ...row, air: airTimeOf(row.episode, row.show) }));

  if (opts.sort === 'name') {
    timed.sort((a, b) => a.show.name.localeCompare(b.show.name));
  } else {
    timed.sort((a, b) => {
      const at = a.air.instant?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.air.instant?.toMillis() ?? Number.MAX_SAFE_INTEGER;
      return at - bt || a.show.name.localeCompare(b.show.name);
    });
  }

  if (ctx.json) {
    printJson({
      date,
      country: country ?? null,
      web,
      zone: userZone(),
      count: timed.length,
      episodes: timed.map(({ show, episode, air }) => ({
        show: toShowSummary(show),
        episode: {
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
          url: episode.url,
        },
        airs: { ...toJson(air), relative: relativeTime(air, reference) },
      })),
    });
    return;
  }

  println();
  println(theme.title(label.charAt(0).toUpperCase() + label.slice(1)));
  println(
    theme.muted(
      `${timed.length} episode${timed.length === 1 ? '' : 's'} · your time zone is ${userZone()}`,
    ),
  );
  println(
    renderTable({
      head: ['Show', 'Episode', 'Network', 'Airs', 'Countdown'],
      rows: timed.map(({ show, episode, air }) => {
        const airs = [formatNetworkTime(air)];
        if (air.hasTime && air.instant && !sameZoneAsUser(air)) {
          airs.push(theme.muted(`you: ${formatLocalTime(air)}`));
        }
        return [
          theme.name(truncate(show.name, 32)),
          `${theme.accent(episodeCode(episode))} ${truncate(episode.name ?? '', 36)}`.trim(),
          truncate(networkName(show) || '-', 20),
          airs.join('\n'),
          relativeTime(air, reference),
        ];
      }),
    }),
  );
  println();
}

export function registerSchedule(program: Command, version: string): void {
  program
    .command('schedule')
    .description('list the TV schedule for a day (default: today, US)')
    .argument('[date]', 'today, tomorrow, yesterday, "next friday" or 2026-09-14', 'today')
    .option('-c, --country <code>', 'ISO country code, e.g. US or GB', parseCountry)
    .option('-f, --filter <text>', 'only show entries whose name matches')
    .option('-w, --web', 'streaming / web channel releases instead of broadcast TV')
    .option('-s, --sort <order>', 'sort by "time" or "name"', parseSort, 'time')
    .action(async (date: string | undefined, opts: ScheduleOptions, cmd: Command) => {
      await runSchedule(buildContext(cmd, version), date, opts);
    });
}
