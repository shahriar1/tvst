#!/usr/bin/env node

const program = require('commander');

program
    .version('0.0.1')
    .description('TV Shows Tracker (TVST) on command line');

program
    .command('schedule <date>', 'Show list of TV shows of a specific date');

program
    .command('ne <show-name>', 'Date & Air time of the next episode of a show');

program
    .command('pe <show-name>', 'Date & Air time of the previous episode of a show');

program
  .command('fav-add', 'Add TV shows in your favorite list');


//open help if no argument is provided 
if (process.argv.length <= 2) {
    program.help();
}

const isUnknownCommand = program.parse(process.argv);

//for unknown command
if (isUnknownCommand) {
    program.help();
}
