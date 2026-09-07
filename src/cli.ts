#!/usr/bin/env node
import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('tvst')
  .description('TV Shows Tracker (TVST) on the command line')
  .version(pkg.version, '-V, --version', 'print the version number');

program.parse(process.argv);
