const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');
const _ = require('lodash');
const os = require('os');

program
  .parse(process.argv);

const spinner = ora('Wait for it...').start();

var selectAndRemoveShows = showsResponse => {
  spinner.stop();

  let allShows = showsResponse.map(show => {
    return {name: show.name, value: show.tvRageId};
  });

  let showSelectionInput = {
    type: "checkbox",
    message: "Select the show(s) you want to remove",
    name: "favShows",
    choices: allShows
  };

  inquirer.prompt([showSelectionInput]).then(answer => {
    let newFavoriteShows = allShows.filter(show => {
      return !answer.favShows.includes(show.value);
    });
    utils.bookmarkShows(_.map(newFavoriteShows, 'value'), true)
      .then(() => {
        console.log(chalk.yellow(`${os.EOL}Removed successfully from your favorite shows!${os.EOL}`));
      })
      .catch(() => {
        console.log(chalk.red(`${os.EOL}Error removing from your favoirte shows!${os.EOL}`));
      });
  });
};

utils
  .formatBookmarkedShows()
  .then((shows) => {
    spinner.stop();
    selectAndRemoveShows(shows);
  })
  .catch(() => {
    spinner.stop();
    console.log(chalk.yellow(`${os.EOL}You have no TV Shows added as your favorite shows! ${os.EOL}Try adding using the command ${chalk.green('tvst fav-add')}${os.EOL}`));
  });
