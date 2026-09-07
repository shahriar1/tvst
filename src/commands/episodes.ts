import type { Command } from 'commander';
import { buildContext, type Context } from '../lib/context.js';
import { episodeJson, type ShowEpisodes, splitEpisodes } from '../lib/episodes.js';
import { CliError, ExitCode, printJson, println } from '../lib/output.js';
import { toShowSummary } from '../lib/show.js';
import { episodeCard, episodeOneLiner } from '../ui/card.js';
import { withSpinner } from '../ui/spinner.js';
import { theme } from '../ui/theme.js';
import { joinName, parsePositiveInt } from './shared.js';

type Mode = 'next' | 'previous';

/** Search by name, then load every hit with its next and previous episode embedded. */
export async function lookupShows(
  ctx: Context,
  query: string,
  limit: number,
): Promise<ShowEpisodes[]> {
  return withSpinner(ctx, `Looking up "${query}"`, async () => {
    const hits = await ctx.client.searchShows(query);
    const shows = await Promise.all(
      hits
        .slice(0, limit)
        .map((hit) => ctx.client.show(hit.show.id, ['nextepisode', 'previousepisode'])),
    );
    return shows.map(splitEpisodes);
  });
}

export function episodesJson(entries: ShowEpisodes[]): Array<{
  show: ReturnType<typeof toShowSummary>;
  next: ReturnType<typeof episodeJson> | null;
  previous: ReturnType<typeof episodeJson> | null;
}> {
  return entries.map(({ show, next, previous }) => ({
    show: toShowSummary(show),
    next: next ? episodeJson(next, show) : null,
    previous: previous ? episodeJson(previous, show) : null,
  }));
}

export async function runEpisodes(
  ctx: Context,
  mode: Mode,
  query: string,
  limit: number,
): Promise<void> {
  const entries = await lookupShows(ctx, query, limit);
  if (entries.length === 0) {
    throw new CliError(
      `No show found matching "${query}"`,
      ExitCode.NO_RESULTS,
      'Try "tvst search <name>" with a shorter name.',
    );
  }

  if (ctx.json) {
    printJson({ query, shows: episodesJson(entries) });
    return;
  }

  const withEpisode = entries.filter((e) => (mode === 'next' ? e.next : e.previous));
  const without = entries.filter((e) => !(mode === 'next' ? e.next : e.previous));

  println();
  if (withEpisode.length === 0) {
    println(
      theme.warn(
        mode === 'next'
          ? `No upcoming episode is scheduled for any show matching "${query}".`
          : `No aired episode is on record for any show matching "${query}".`,
      ),
    );
  }
  for (const entry of withEpisode) {
    const episode = mode === 'next' ? entry.next : entry.previous;
    const air = mode === 'next' ? entry.nextAir : entry.previousAir;
    if (!episode || !air) continue;
    println(episodeCard(entry.show, episode, air, mode));
    println();
  }

  if (without.length > 0) {
    println(
      theme.muted(mode === 'next' ? 'Ended or nothing scheduled yet:' : 'Nothing has aired yet:'),
    );
    for (const entry of without) {
      const fallback = mode === 'next' ? entry.previous : entry.next;
      const fallbackAir = mode === 'next' ? entry.previousAir : entry.nextAir;
      println(`  ${episodeOneLiner(entry.show, fallback, fallbackAir)}`);
    }
    println();
  }
}

function register(program: Command, version: string, mode: Mode): void {
  const name = mode === 'next' ? 'next' : 'prev';
  const alias = mode === 'next' ? 'ne' : 'pe';
  const description =
    mode === 'next'
      ? 'when the next episode of a show airs'
      : 'when the most recent episode of a show aired';

  program
    .command(name)
    .alias(alias)
    .description(description)
    .argument('<name...>', 'show name (quotes are optional)')
    .option('-n, --limit <count>', 'how many matching shows to look up', parsePositiveInt, 5)
    .action(async (parts: string[], opts: { limit: number }, cmd: Command) => {
      await runEpisodes(buildContext(cmd, version), mode, joinName(parts), opts.limit);
    });
}

export function registerNext(program: Command, version: string): void {
  register(program, version, 'next');
}

export function registerPrev(program: Command, version: string): void {
  register(program, version, 'previous');
}
