import test from 'ava';
const execa = require('execa');
const moment = require('moment-timezone');

moment.tz.setDefault('America/New_York');


test('ne - next episode should return valid output', async t => {
    const {stdout} = await execa.shell('../tvst.js ne "person of interest"');
    t.true(stdout.includes('Person of Interest'));
    t.true(stdout.includes('Episode Name:'));
    t.true(stdout.includes('Network: CBS'));
    t.true(stdout.includes('Network Time:'));
    t.true(stdout.includes('User Time:'));
    t.true(stdout.includes('Aired Date:'));
});


test('ne - next episode with a keyword should return valid output', async t => {
    const {stdout} = await execa.shell('../tvst.js pe "game"');
    t.true(stdout.includes('Game of Thrones'));
    t.true(stdout.includes('The Game'));
    t.true(stdout.includes('Game On'));
    t.true(stdout.includes('Match Game'));
    t.true(stdout.includes('Episode Name:'));
    t.true(stdout.includes('Last Episode Name:'));
    t.true(stdout.includes('Network: HBO'));
    t.true(stdout.includes('Network Time:'));
    t.true(stdout.includes('User Time:'));
    t.true(stdout.includes('Aired Date:'));
});

test('pe - previous episode should return valid output', async t => {
    const {stdout} = await execa.shell('../tvst.js pe "game of thrones"');
    t.true(stdout.includes('Game of Thrones'));
    t.true(stdout.includes('Episode Name:'));
    t.true(stdout.includes('Network: HBO'));
    t.true(stdout.includes('Network Time:'));
    t.true(stdout.includes('User Time:'));
    t.true(stdout.includes('Aired Date:'));
});

test('schedule - schedule of today should return valid output', async t => {
    const {stdout} = await execa.shell('../tvst.js schedule today');
    const header = 'List of TV  Shows at ' + moment().format('MMM Do,YYYY');
    t.true(stdout.includes(header));
    t.true(stdout.includes('Name'));
    t.true(stdout.includes('Details'));
    t.true(stdout.includes('Time'));
    t.true(stdout.includes('Network:'));
    t.true(stdout.includes('Season:'));
    t.true(stdout.includes('Network Time:'));
    t.true(stdout.includes('Your Time:'));
    t.true(stdout.includes('Countdown:'));
});

test('schedule - schedule  of tomorrow should return valid output', async t => {
    const {stdout} = await execa.shell('../tvst.js schedule tomorrow');
    const header = 'List of TV  Shows at ' + moment().add(1, 'days').format('MMM Do,YYYY');
    t.true(stdout.includes(header));
    t.true(stdout.includes('Name'));
    t.true(stdout.includes('Details'));
    t.true(stdout.includes('Time'));
    t.true(stdout.includes('Network:'));
    t.true(stdout.includes('Season:'));
    t.true(stdout.includes('Network Time:'));
    t.true(stdout.includes('Your Time:'));
    t.true(stdout.includes('Countdown:'));
});


test('schedule - schedule of yesterday should return valid output', async t => {
    const {stdout} = await execa.shell('../tvst.js schedule yesterday');
    const header = 'List of TV  Shows at ' + moment().add(-1, 'days').format('MMM Do,YYYY');
    t.true(stdout.includes(header));
    t.true(stdout.includes('Name'));
    t.true(stdout.includes('Details'));
    t.true(stdout.includes('Time'));
    t.true(stdout.includes('Network:'));
    t.true(stdout.includes('Season:'));
    t.true(stdout.includes('Network Time:'));
    t.true(stdout.includes('Your Time:'));
    t.true(stdout.includes('Countdown:'));
});

test('invalid command should return help', async t => {
    const {stdout} = await execa.shell('../tvst.js unknows');
    t.true(stdout.includes('Usage: tvst [options] [command]'));
    t.true(stdout.includes('-h, --help     output usage information'));
});

