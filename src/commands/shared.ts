import { InvalidArgumentError } from 'commander';

/** Join a variadic name argument so `tvst next game of thrones` works unquoted. */
export function joinName(parts: string[]): string {
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('expected a positive whole number');
  }
  return parsed;
}
