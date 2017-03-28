const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');


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
    .then( showsResponse => {
      showsResponse.forEach(function(show) {
        showDetails.push({value: show.tvRageId, name: show.name});
      });
      return showDetails;
    }).then(function(showDetails) {
      let showSelectionInput = [
        {
          type: "checkbox",
          message: "Select your favorite shows",
          name: "favShow",
          choices: showDetails
        }
      ];
    inquirer.prompt(showSelectionInput).then(function(answer) {
      console.log(answer);
    })
  });
});

