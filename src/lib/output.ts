export const ExitCode = {
  OK: 0,
  NO_RESULTS: 1,
  USAGE: 2,
  NETWORK: 3,
  CANCELLED: 130,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/** An error that carries the exit code the CLI should finish with. */
export class CliError extends Error {
  readonly exitCode: ExitCodeValue;
  readonly hint: string | undefined;

  constructor(message: string, exitCode: ExitCodeValue, hint?: string) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.hint = hint;
  }
}

export function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function println(line = ''): void {
  process.stdout.write(`${line}\n`);
}

export function eprintln(line = ''): void {
  process.stderr.write(`${line}\n`);
}
