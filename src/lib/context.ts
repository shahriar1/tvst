import type { Command } from 'commander';
import { createClient, type TvMazeClient } from '../api/tvmaze.js';
import { configureTheme } from '../ui/theme.js';
import { isInteractive } from './interactive.js';

export interface Context {
  json: boolean;
  color: boolean;
  interactive: boolean;
  client: TvMazeClient;
}

export interface GlobalOptions {
  json?: boolean;
  color?: boolean;
}

export function buildContext(command: Command, version: string): Context {
  const opts = command.optsWithGlobals<GlobalOptions>();
  const json = opts.json === true;
  const color = opts.color !== false && !json;
  configureTheme({ color });
  return {
    json,
    color,
    interactive: isInteractive() && !json,
    client: createClient({ userAgent: `tvst/${version} (+https://github.com/shahriar1/tvst)` }),
  };
}
