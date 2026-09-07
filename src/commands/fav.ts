import { confirm, isCancel, multiselect, text } from '@clack/prompts';
import type { Command } from 'commander';
import { DateTime } from 'luxon';
import type { Show } from '../api/types.js';
import { buildContext, type Context } from '../lib/context.js';
import {
  type AirTime,
  formatLocalTime,
  formatNetworkTime,
  now,
  relativeTime,
  sameZoneAsUser,
} from '../lib/dates.js';
import { episodeJson, type ShowEpisodes, splitEpisodes } from '../lib/episodes.js';
import { nameMatches } from '../lib/fuzzy.js';
import { CliError, ExitCode, printJson, println } from '../lib/output.js';
import { countryCode, episodeCode, networkName, toShowSummary } from '../lib/show.js';
import { createStore, type Favorite, type FavoriteStore } from '../lib/store.js';
import { withSpinner } from '../ui/spinner.js';
import { renderTable, truncate } from '../ui/table.js';
import { theme } from '../ui/theme.js';
import { joinName, parsePositiveInt } from './shared.js';

const EMBEDS = ['nextepisode', 'previousepisode'] as const;
const NO_FAVORITES_HINT = 'Add one with "tvst fav add <name>".';

function cancelled(): CliError {
  return new CliError('Cancelled.', ExitCode.CANCELLED);
}

function describe(show: Show): string {
  const bits = [
    networkName(show),
    countryCode(show),
    show.premiered?.slice(0, 4),
    show.status,
  ].filter(Boolean);
  return bits.join(' · ');
}

function toFavorite(show: Show): Pick<Favorite, 'id' | 'name' | 'network'> {
  return { id: show.id, name: show.name, network: networkName(show) };
}

async function loadFavorites(ctx: Context, store: FavoriteStore): Promise<ShowEpisodes[]> {
  const favorites = store.list();
  const shows = await withSpinner(ctx, 'Checking your favorite shows', () =>
    Promise.all(favorites.map((f) => ctx.client.show(f.id, [...EMBEDS]))),
  );
  for (const show of shows) {
    const stored = favorites.find((f) => f.id === show.id);
    if (stored && (stored.name !== show.name || stored.network !== networkName(show))) {
      store.update(show.id, toFavorite(show));
    }
  }
  return shows.map(splitEpisodes);
}

function airsCell(air: AirTime | undefined): string {
  if (!air) return '-';
  const lines = [formatNetworkTime(air)];
  if (air.hasTime && air.instant && !sameZoneAsUser(air)) {
    lines.push(theme.muted(`you: ${formatLocalTime(air)}`));
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// fav add
// ---------------------------------------------------------------------------

interface AddOptions {
  id?: number[];
  first?: boolean;
}

async function pickShows(ctx: Context, query: string, opts: AddOptions): Promise<Show[]> {
  if (opts.id?.length) {
    return withSpinner(ctx, 'Loading shows', () =>
      Promise.all(opts.id?.map((id) => ctx.client.show(id)) ?? []),
    );
  }

  let name = query;
  if (!name) {
    if (!ctx.interactive) {
      throw new CliError(
        'Give a show name or --id <id>.',
        ExitCode.USAGE,
        'Example: tvst fav add severance',
      );
    }
    const answer = await text({
      message: 'Which show do you want to add?',
      placeholder: 'e.g. Severance',
      validate: (value) => (value?.trim() ? undefined : 'Type a show name'),
    });
    if (isCancel(answer)) throw cancelled();
    name = answer.trim();
  }

  const hits = await withSpinner(ctx, `Searching for "${name}"`, () =>
    ctx.client.searchShows(name),
  );
  const shows = hits.map((h) => h.show);
  if (shows.length === 0) {
    throw new CliError(`No show found matching "${name}"`, ExitCode.NO_RESULTS);
  }
  const first = shows[0];
  if (shows.length === 1 || opts.first) {
    return first ? [first] : [];
  }

  if (!ctx.interactive) {
    const list = shows
      .slice(0, 8)
      .map((s) => `  ${String(s.id).padStart(6)}  ${s.name}  ${theme.muted(describe(s))}`);
    throw new CliError(
      `Several shows match "${name}":\n${list.join('\n')}`,
      ExitCode.USAGE,
      'Pick one with "tvst fav add --id <id>" or take the best match with "--first".',
    );
  }

  const chosen = await multiselect({
    message: 'Select the show(s) to add',
    options: shows.slice(0, 15).map((s) => ({ value: s.id, label: s.name, hint: describe(s) })),
    initialValues: first ? [first.id] : [],
    required: true,
  });
  if (isCancel(chosen)) throw cancelled();
  const wanted = new Set(chosen);
  return shows.filter((s) => wanted.has(s.id));
}

export async function runFavAdd(ctx: Context, query: string, opts: AddOptions): Promise<void> {
  const store = createStore();
  const shows = await pickShows(ctx, query, opts);
  const { added, skipped } = store.add(shows.map(toFavorite));

  if (ctx.json) {
    printJson({ configPath: store.path, added, skipped });
    return;
  }
  println();
  for (const f of added)
    println(theme.success(`✔ Added ${f.name}${f.network ? theme.muted(` (${f.network})`) : ''}`));
  for (const f of skipped) println(theme.muted(`· ${f.name} was already a favorite`));
  println(theme.muted(`Favorites are stored in ${store.path}`));
  println();
}

// ---------------------------------------------------------------------------
// fav list
// ---------------------------------------------------------------------------

export async function runFavList(ctx: Context, opts: { offline?: boolean }): Promise<void> {
  const store = createStore();
  const favorites = store.list();

  if (favorites.length === 0) {
    if (ctx.json) {
      printJson({ configPath: store.path, favorites: [] });
      return;
    }
    println();
    println(theme.warn('You have no favorite shows yet.'));
    println(theme.muted(NO_FAVORITES_HINT));
    println();
    return;
  }

  if (opts.offline) {
    if (ctx.json) {
      printJson({ configPath: store.path, favorites });
      return;
    }
    println();
    println(theme.title('Your favorite shows'));
    println(
      renderTable({
        head: ['ID', 'Show', 'Network', 'Added'],
        rows: favorites.map((f) => [
          f.id,
          theme.name(f.name || `#${f.id}`),
          f.network || '-',
          f.addedAt.slice(0, 10),
        ]),
      }),
    );
    println();
    return;
  }

  const entries = await loadFavorites(ctx, store);
  const reference = now();
  entries.sort((a, b) => {
    const at = a.nextAir?.instant?.toMillis() ?? Number.MAX_SAFE_INTEGER;
    const bt = b.nextAir?.instant?.toMillis() ?? Number.MAX_SAFE_INTEGER;
    return at - bt || a.show.name.localeCompare(b.show.name);
  });

  if (ctx.json) {
    printJson({
      configPath: store.path,
      favorites: entries.map(({ show, next, previous }) => ({
        show: toShowSummary(show),
        next: next ? episodeJson(next, show) : null,
        previous: previous ? episodeJson(previous, show) : null,
      })),
    });
    return;
  }

  println();
  println(theme.title('Your favorite shows'));
  println(
    theme.muted(
      `${entries.length} show${entries.length === 1 ? '' : 's'} · your time zone is ${formatLocalTimeZone()}`,
    ),
  );
  println(
    renderTable({
      head: ['Show', 'Status', 'Next episode', 'Airs', 'Countdown', 'Last episode'],
      rows: entries.map(({ show, next, previous, nextAir, previousAir }) => [
        `${theme.name(truncate(show.name, 30))}\n${theme.muted(truncate(networkName(show) || '-', 30))}`,
        show.status,
        next
          ? `${theme.accent(episodeCode(next))} ${truncate(next.name ?? '', 30)}`.trim()
          : theme.muted('none scheduled'),
        next ? airsCell(nextAir) : '-',
        next && nextAir ? relativeTime(nextAir, reference) : '-',
        previous && previousAir
          ? `${episodeCode(previous)}\n${theme.muted(relativeTime(previousAir, reference))}`
          : '-',
      ]),
    }),
  );
  println();
}

function formatLocalTimeZone(): string {
  return DateTime.local().zoneName ?? 'local';
}

// ---------------------------------------------------------------------------
// fav remove
// ---------------------------------------------------------------------------

export async function runFavRemove(
  ctx: Context,
  terms: string[],
  opts: { all?: boolean },
): Promise<void> {
  const store = createStore();
  const favorites = store.list();

  if (favorites.length === 0) {
    throw new CliError('You have no favorite shows yet.', ExitCode.NO_RESULTS, NO_FAVORITES_HINT);
  }

  let targets: Favorite[];
  if (opts.all) {
    if (ctx.interactive) {
      const ok = await confirm({
        message: `Remove all ${favorites.length} favorite shows?`,
        initialValue: false,
      });
      if (isCancel(ok) || !ok) throw cancelled();
    }
    targets = favorites;
  } else if (terms.length > 0) {
    targets = favorites.filter((f) =>
      terms.some((term) =>
        /^\d+$/.test(term) ? f.id === Number(term) : nameMatches(f.name, term),
      ),
    );
    if (targets.length === 0) {
      throw new CliError(
        `None of your favorites match ${terms.map((t) => `"${t}"`).join(', ')}.`,
        ExitCode.NO_RESULTS,
        'Run "tvst fav list --offline" to see what is saved.',
      );
    }
  } else if (ctx.interactive) {
    const chosen = await multiselect({
      message: 'Select the show(s) to remove',
      options: favorites.map((f) => ({
        value: f.id,
        label: f.name || `#${f.id}`,
        hint: f.network,
      })),
      required: true,
    });
    if (isCancel(chosen)) throw cancelled();
    const wanted = new Set(chosen);
    targets = favorites.filter((f) => wanted.has(f.id));
  } else {
    const list = favorites.map(
      (f) => `  ${String(f.id).padStart(6)}  ${f.name || '(name unknown)'}`,
    );
    throw new CliError(
      `Say which show to remove:\n${list.join('\n')}`,
      ExitCode.USAGE,
      'Example: tvst fav remove 82, tvst fav remove "game of thrones", or tvst fav remove --all',
    );
  }

  const removed = store.remove(targets.map((f) => f.id));
  if (ctx.json) {
    printJson({ configPath: store.path, removed });
    return;
  }
  println();
  for (const f of removed) println(theme.warn(`✔ Removed ${f.name || `#${f.id}`}`));
  println();
}

// ---------------------------------------------------------------------------
// fav upcoming
// ---------------------------------------------------------------------------

export async function runFavUpcoming(ctx: Context, opts: { days: number }): Promise<void> {
  const store = createStore();
  if (store.list().length === 0) {
    throw new CliError('You have no favorite shows yet.', ExitCode.NO_RESULTS, NO_FAVORITES_HINT);
  }

  const entries = await loadFavorites(ctx, store);
  const from = now();
  const to = from.plus({ days: opts.days }).endOf('day');

  const upcoming = entries
    .flatMap((entry) => {
      const { next, nextAir } = entry;
      if (!next || !nextAir?.instant) return [];
      const at = nextAir.hasTime ? nextAir.instant : nextAir.instant.startOf('day');
      if (at < from.startOf('day') || at > to) return [];
      return [{ ...entry, next, nextAir, at }];
    })
    .sort((a, b) => a.at.toMillis() - b.at.toMillis());

  if (ctx.json) {
    printJson({
      days: opts.days,
      from: from.toISO(),
      to: to.toISO(),
      episodes: upcoming.map(({ show, next }) => ({
        show: toShowSummary(show),
        episode: episodeJson(next, show),
      })),
    });
    return;
  }

  if (upcoming.length === 0) {
    throw new CliError(
      `Nothing from your favorites airs in the next ${opts.days} day${opts.days === 1 ? '' : 's'}.`,
      ExitCode.NO_RESULTS,
      'Try a longer window with --days, or "tvst fav list" to see every show.',
    );
  }

  println();
  println(theme.title(`Coming up in the next ${opts.days} day${opts.days === 1 ? '' : 's'}`));
  println(
    renderTable({
      head: ['When', 'Show', 'Episode', 'Network', 'Countdown'],
      rows: upcoming.map(({ show, next, nextAir, at }) => [
        `${at.toLocal().toFormat('ccc LLL d')}\n${airsCell(nextAir)}`,
        theme.name(truncate(show.name, 30)),
        `${theme.accent(episodeCode(next))} ${truncate(next.name ?? '', 32)}`.trim(),
        truncate(networkName(show) || '-', 20),
        relativeTime(nextAir, from),
      ]),
    }),
  );
  println();
}

// ---------------------------------------------------------------------------
// registration
// ---------------------------------------------------------------------------

function parseIdList(value: string, previous: number[] = []): number[] {
  return [...previous, ...value.split(',').map((v) => parsePositiveInt(v.trim()))];
}

export function registerFav(program: Command, version: string): void {
  const fav = program.command('fav').description('manage and track your favorite shows');

  fav
    .command('add')
    .description('add show(s) to your favorites')
    .argument('[name...]', 'show name to search for')
    .option('--id <ids>', 'TVMaze show id(s), comma separated or repeated', parseIdList)
    .option('--first', 'take the best search match without asking')
    .action(async (parts: string[], opts: AddOptions, cmd: Command) => {
      await runFavAdd(buildContext(cmd, version), joinName(parts), opts);
    });

  fav
    .command('list')
    .description('your favorite shows with their next and last episodes')
    .option('--offline', 'only what is saved locally, no network')
    .action(async (opts: { offline?: boolean }, cmd: Command) => {
      await runFavList(buildContext(cmd, version), opts);
    });

  fav
    .command('remove')
    .alias('rm')
    .description('remove show(s) from your favorites')
    .argument('[name-or-id...]', 'show names or ids to remove')
    .option('--all', 'remove every favorite')
    .action(async (terms: string[], opts: { all?: boolean }, cmd: Command) => {
      await runFavRemove(buildContext(cmd, version), terms, opts);
    });

  fav
    .command('upcoming')
    .description('episodes of your favorites airing soon')
    .option('-d, --days <count>', 'how many days ahead to look', parsePositiveInt, 7)
    .action(async (opts: { days: number }, cmd: Command) => {
      await runFavUpcoming(buildContext(cmd, version), opts);
    });

  // The 0.x command names keep working, but stay out of the help output.
  program
    .command('fav-add', { hidden: true })
    .argument('[name...]')
    .option('--id <ids>', 'TVMaze show id(s)', parseIdList)
    .option('--first')
    .action(async (parts: string[], opts: AddOptions, cmd: Command) => {
      await runFavAdd(buildContext(cmd, version), joinName(parts), opts);
    });
  program
    .command('fav-list', { hidden: true })
    .option('--offline')
    .action(async (opts: { offline?: boolean }, cmd: Command) => {
      await runFavList(buildContext(cmd, version), opts);
    });
  program
    .command('fav-remove', { hidden: true })
    .argument('[name-or-id...]')
    .option('--all')
    .action(async (terms: string[], opts: { all?: boolean }, cmd: Command) => {
      await runFavRemove(buildContext(cmd, version), terms, opts);
    });
}
