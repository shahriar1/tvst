const program = require('commander');
const datej = require('date.js');
const moment = require('moment-timezone');
const chalk = require('chalk');
const ora = require('ora');
const _ = require('lodash');

const utils = require('./utils');
const templates = require('./templates');

//set user's timezone as default 
moment.tz.setDefault(moment.tz.guess());

var showDate = moment();
var countryShort = 'US';
var filter = '';

program
  .option('-c --country <country>', 'ISO country code - eg. US or GB etc.')
  .option('-f --filter <filter>', 'Filter by show name')
  .action((day = 'today') => {

    let parsedDate = new Date(day);

    //if not a valid date check if day is day of the week (e.g. today, yesterday, tomorrow etc.)
    if (isNaN(parsedDate.getTime())) {
      parsedDate = datej(day);
    }

    filter = program.filter;
    countryShort = program.country || countryShort;
    showDate = moment(parsedDate.getTime());
  })
  .parse(process.argv);


const spinner = ora('Wait for it...').start();

utils
  .fetchShowsByDate(showDate, countryShort)
  .then((response) => {
    utils
      .formatDailyShows(response)
      .then(shows => {
        spinner.stop();

        if (filter) {
          shows = utils.dailyShowsFullTexSearch(shows, 'name', filter);
        }

        templates.dailyShowsList(shows, showDate);
      })
      .catch(() => {
        spinner.stop();
        templates.showConnectionError();
      });
  })
  .catch(() => {
    spinner.stop();
    templates.showConnectionError();
  });
