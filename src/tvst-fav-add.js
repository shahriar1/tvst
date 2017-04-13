const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');
const os = require('os');

program
  .parse(process.argv);

const showNameInput = {
  type: 'input',
  name: 'showName',
  message: 'Name of the TV Show you want to add as favorite:'
};

var showDetails = [];
inquirer.prompt([showNameInput]).then(answer => {
  return answer.showName;
}).then(showName => {
  const spinner = ora('Wait for it...').start();
  utils
    .fetchShowsByKeyword(showName)
    .then(showsResponse => {
      showsResponse.forEach(show => {
        showDetails.push({value: show.id, name: `${show.name} (${chalk.dim(`${show.network}`)})`});
      });
      return showDetails;
    })
    .then(showDetails => {
      if (showDetails.length < 1) {
        spinner.stop();
        console.log(chalk.red(`${os.EOL}Couldn't find any TV shows matching '${showName}'${os.EOL}`));
        return;
      }
      spinner.stop();
      
      let showSelectionInput = {
        type: "checkbox",
        message: "Select your favorite shows",
        name: "favShows",
        choices: showDetails
      };
      inquirer.prompt([showSelectionInput]).then(answer => {
        utils.bookmarkShows(answer.favShows)
          .then(() => {
            console.log(chalk.green(`${os.EOL}Added successfully as your favorite show!${os.EOL}`));
          })
          .catch(() => {
            console.log(chalk.red(`${os.EOL}Error adding as your favoirte show!${os.EOL}`));
          });
      });
    })
    .catch(() => {
      spinner.stop();
      templates.showConnectionError();
    });
});
