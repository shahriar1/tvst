import { Chalk, type ChalkInstance } from 'chalk';

const detected = new Chalk();
let chalk: ChalkInstance = detected;

/**
 * Force colors off (for --json or --no-color). chalk already honours NO_COLOR,
 * FORCE_COLOR and --no-color on argv by itself; this is the explicit override.
 */
export function configureTheme(options: { color: boolean }): void {
  chalk = options.color ? detected : new Chalk({ level: 0 });
}

export function colorsEnabled(): boolean {
  return chalk.level > 0;
}

export const theme = {
  title: (s: string) => chalk.bold.green(s),
  heading: (s: string) => chalk.bold(s),
  label: (s: string) => chalk.dim(s),
  name: (s: string) => chalk.bold.cyan(s),
  accent: (s: string) => chalk.cyan(s),
  muted: (s: string) => chalk.dim(s),
  success: (s: string) => chalk.green(s),
  warn: (s: string) => chalk.yellow(s),
  error: (s: string) => chalk.bold.red(s),
  bold: (s: string) => chalk.bold(s),
};
