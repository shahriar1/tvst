import { spinner as clackSpinner } from '@clack/prompts';
import type { Context } from '../lib/context.js';

/** Run `task` behind a spinner when the terminal is interactive; silently otherwise. */
export async function withSpinner<T>(
  ctx: Pick<Context, 'interactive'>,
  message: string,
  task: () => Promise<T>,
): Promise<T> {
  if (!ctx.interactive) return task();
  const s = clackSpinner();
  s.start(message);
  try {
    const result = await task();
    s.clear();
    return result;
  } catch (error) {
    s.error(message);
    throw error;
  }
}
