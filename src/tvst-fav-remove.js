const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');
const fs = require('fs');
const _ = require('lodash');

const spinner = ora('Wait for it...').start();

var selectAndRemoveShows = function(showsResponse) {
  spinner.stop();

  if (showsResponse.length < 1) {
    console.log(chalk.yellow(`\nYou have no TV Shows added as your favorite shows! \nTry adding using the command ${chalk.green('tvst fav-add')}\n`));
    return;
  }

  let allShows = showsResponse.map( show => {
    return {name: show.name, value: show.tvRageId};
  });

  let showSelectionInput = {
    type: "checkbox",
    message: "Select the show(s) you want to remove",
    name: "favShows",
    choices: allShows
  };

  inquirer.prompt([showSelectionInput]).then(function(answer) {
    let newFavoriteShows = allShows.filter(function(show) {
      return !answer.favShows.includes(show.value);
    });
    utils.bookmarkShows(_.map(newFavoriteShows, 'value'), true);
  });
};

utils.formatBookmarkedShows(selectAndRemoveShows);
