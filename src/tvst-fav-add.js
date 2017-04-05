const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');
const os = require('os');

const showNameInput = {
  type: 'input',
  name: 'showName',
  message: 'Name of the TV Show you want to add as favorite:'
};

var showDetails = [];
inquirer.prompt([showNameInput]).then(answer => {
  return answer.showName;
}).then(showName => {
  utils
    .fetchShowsByKeyword(showName)
    .then(showsResponse => {
      showsResponse.forEach(show => {
        showDetails.push({value: show.tvRageId, name: show.name});
      });
      return showDetails;
    })
    .then(showDetails => {
      if (showDetails.length < 1) {
        console.log(chalk.red(`${os.EOL}Couldn't find any TV shows matching '${showName}'${os.EOL}`));
        return;
      }

      let showSelectionInput = {
        type: "checkbox",
        message: "Select your favorite shows",
        name: "favShows",
        choices: showDetails
      };
      inquirer.prompt([showSelectionInput]).then(answer => {
        utils.bookmarkShows(answer.favShows);
      });
    });
});
