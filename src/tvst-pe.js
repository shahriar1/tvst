const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');


var showName = '';
program
  .action(function(show, a) {
    if (program.args.length > 2) {
      //get showName if it is not quoted
      showName = program.args.slice(0, program.args.length - 1).join(' ');
    } else {
      showName = show;
    }
  })
  .parse(process.argv);


const spinner = ora('Wait for it...').start();

utils
  .fetchShowsByKeyword(showName)
  .then(showsResponse => {

    spinner.stop();

    if (showsResponse.length === 0) {
      templates.noShowFound(showName);
      return;
    }
    let shows = [];
    shows.previousEpisodes = showsResponse;

    const allPreviousEpisodes = utils.getPreviousEpisodes(shows);

    allPreviousEpisodes.then((episodes) => {

      if (episodes.length < 1) {
        console.log('');
        console.log(chalk.yellow(`Couldn't find any info of previous episode of show(s) matching '${showName}'`));
      }

      episodes.forEach(episode => {
        let message = chalk.green.bold(episode.show.name);
        templates.previousEpisode(episode, message);
      });
    });
  })
  .catch(e => {
    spinner.stop();
    console.log(chalk.bold.red(e.message));
  });
