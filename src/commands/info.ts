import type { Command } from 'commander';
import { NotFoundError } from '../api/tvmaze.js';
import type { Show } from '../api/types.js';
import { buildContext, type Context } from '../lib/context.js';
import { episodeJson, splitEpisodes } from '../lib/episodes.js';
import { CliError, ExitCode, printJson, println } from '../lib/output.js';
import { toShowSummary } from '../lib/show.js';
import { episodeCard, infoCard, linksBlock } from '../ui/card.js';
import { withSpinner } from '../ui/spinner.js';
import { theme } from '../ui/theme.js';
import { joinName, parsePositiveInt } from './shared.js';

const EMBEDS = ['nextepisode', 'previousepisode'] as const;

export async function findShow(
  ctx: Context,
  query: string,
  id: number | undefined,
): Promise<Show | null> {
  if (id !== undefined) {
    try {
      return await ctx.client.show(id, [...EMBEDS]);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
  return ctx.client.singleSearch(query, [...EMBEDS]);
}

export async function runInfo(ctx: Context, query: string, id: number | undefined): Promise<void> {
  const label = id !== undefined ? `show #${id}` : `"${query}"`;
  const show = await withSpinner(ctx, `Looking up ${label}`, () => findShow(ctx, query, id));
  if (!show) {
    throw new CliError(
      `No show found matching ${label}`,
      ExitCode.NO_RESULTS,
      'Try "tvst search <name>" to browse matches.',
    );
  }

  const { next, previous, nextAir, previousAir } = splitEpisodes(show);

  if (ctx.json) {
    printJson({
      show: toShowSummary(show),
      summary: show.summary,
      schedule: show.schedule,
      externals: show.externals,
      image: show.image,
      next: next ? episodeJson(next, show) : null,
      previous: previous ? episodeJson(previous, show) : null,
    });
    return;
  }

  println();
  println(infoCard(show));
  println();
  if (next && nextAir) {
    println(episodeCard(show, next, nextAir, 'next', { headline: false }));
    println();
  }
  if (previous && previousAir) {
    println(episodeCard(show, previous, previousAir, 'previous', { headline: false }));
    println();
  }
  if (!next && !previous) {
    println(theme.muted('  No episodes on record.'));
    println();
  }
  println(linksBlock(show));
  println(theme.muted(`  Add it to your favorites with "tvst fav add --id ${show.id}"`));
  println();
}

export function registerInfo(program: Command, version: string): void {
  program
    .command('info')
    .description('details about a show: summary, schedule, next and last episode')
    .argument('[name...]', 'show name (quotes are optional)')
    .option('--id <id>', 'look up by TVMaze show id instead of name', parsePositiveInt)
    .action(async (parts: string[], opts: { id?: number }, cmd: Command) => {
      const query = joinName(parts);
      if (!query && opts.id === undefined) {
        throw new CliError(
          'Give a show name or --id <id>.',
          ExitCode.USAGE,
          'Example: tvst info severance',
        );
      }
      await runInfo(buildContext(cmd, version), query, opts.id);
    });
}
