const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');
const fs = require('fs');

const showNameInput = {
  type: 'input',
  name: 'showName',
  message: 'Name of the TV Show:'
};

var showDetails = [];
inquirer.prompt([showNameInput]).then(function(answer) {
  return answer.showName;
}).then(function(showName) {
  utils
    .fetchShowsByKeyword(showName)
    .then(showsResponse => {
      showsResponse.forEach(function(show) {
        showDetails.push({value: show.tvRageId, name: show.name});
      });
      return showDetails;
    })
    .then(function(showDetails) {
      if (showDetails.length < 1) {
        console.log('');
        console.log(chalk.red(`Couldn't find any TV shows matching '${showName}'`));
        console.log('');
        process.exit();
      }

      let showSelectionInput = {
          type: "checkbox",
          message: "Select your favorite shows",
          name: "favShows",
          choices: showDetails
        };
      inquirer.prompt([showSelectionInput]).then(function(answer) {
        utils.bookmarkShows(answer.favShows)
      })
    });
});
