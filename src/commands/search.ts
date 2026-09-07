import type { Command } from 'commander';
import { buildContext } from '../lib/context.js';
import { CliError, ExitCode, printJson, println } from '../lib/output.js';
import { countryCode, networkName, toShowSummary } from '../lib/show.js';
import { withSpinner } from '../ui/spinner.js';
import { renderTable, truncate } from '../ui/table.js';
import { theme } from '../ui/theme.js';
import { joinName, parsePositiveInt } from './shared.js';

export function registerSearch(program: Command, version: string): void {
  program
    .command('search')
    .description('search TVMaze for shows by name')
    .argument('<name...>', 'show name (quotes are optional)')
    .option('-n, --limit <count>', 'maximum number of results', parsePositiveInt, 10)
    .action(async (parts: string[], opts: { limit: number }, cmd: Command) => {
      const ctx = buildContext(cmd, version);
      const query = joinName(parts);

      const results = await withSpinner(ctx, `Searching for "${query}"`, () =>
        ctx.client.searchShows(query),
      );
      const shows = results.slice(0, opts.limit).map((r) => r.show);

      if (shows.length === 0) {
        throw new CliError(`No show found matching "${query}"`, ExitCode.NO_RESULTS);
      }

      if (ctx.json) {
        printJson(shows.map(toShowSummary));
        return;
      }

      println();
      println(theme.title(`Shows matching "${query}"`));
      println(
        renderTable({
          head: ['ID', 'Name', 'Network', 'Country', 'Status', 'Premiered', 'Rating'],
          rows: shows.map((show) => [
            show.id,
            theme.name(truncate(show.name, 40)),
            truncate(networkName(show) || '-', 24),
            countryCode(show) || '-',
            show.status,
            show.premiered ?? '-',
            show.rating?.average?.toFixed(1) ?? '-',
          ]),
        }),
      );
      println(
        theme.muted(
          'Use "tvst info <name>" for details or "tvst next <name>" for the next episode.',
        ),
      );
      println();
    });
}
