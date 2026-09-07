#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { ApiError, NetworkError, NotFoundError } from './api/tvmaze.js';
import { registerSearch } from './commands/search.js';
import { CliError, ExitCode, type ExitCodeValue, eprintln } from './lib/output.js';
import { theme } from './ui/theme.js';

const program = new Command();

program
  .name('tvst')
  .description('TV Shows Tracker (TVST) on the command line')
  .version(pkg.version, '-V, --version', 'print the version number')
  .option('--json', 'print machine-readable JSON instead of tables')
  .option('--no-color', 'disable colored output (NO_COLOR is also respected)')
  .showHelpAfterError('(run "tvst --help" for usage)')
  .showSuggestionAfterError()
  .exitOverride();

registerSearch(program, pkg.version);

function reportError(error: unknown): ExitCodeValue {
  if (error instanceof CommanderError) {
    // commander already printed help, the version, or a usage message
    return error.exitCode === 0 ? ExitCode.OK : ExitCode.USAGE;
  }

  let message: string;
  let hint: string | undefined;
  let code: ExitCodeValue;

  if (error instanceof CliError) {
    message = error.message;
    hint = error.hint;
    code = error.exitCode;
  } else if (error instanceof NotFoundError) {
    message = 'TVMaze has no record of that.';
    code = ExitCode.NO_RESULTS;
  } else if (error instanceof NetworkError) {
    message = `Could not reach TVMaze. ${error.message}`;
    hint = 'Check your internet connection and try again.';
    code = ExitCode.NETWORK;
  } else if (error instanceof ApiError) {
    message = error.message;
    hint = 'TVMaze may be having trouble; try again in a moment.';
    code = ExitCode.NETWORK;
  } else {
    message = error instanceof Error ? error.message : String(error);
    code = ExitCode.NO_RESULTS;
  }

  if (process.argv.includes('--json')) {
    eprintln(JSON.stringify({ error: message, code }));
  } else {
    eprintln(theme.error(message));
    if (hint) eprintln(theme.muted(hint));
  }
  return code;
}

async function main(): Promise<void> {
  if (process.argv.length <= 2) {
    program.outputHelp();
    return;
  }
  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  process.exitCode = reportError(error);
});
