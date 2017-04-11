const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');


var showName = '';
program
  .action((show) => {
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

    const allShowsByEpisodeType = utils.formatShowsByEpisodeType(showsResponse);
    const allNextEpisodes = utils.getNextEpisodes(allShowsByEpisodeType);
    const allPreviousEpisodes = utils.getPreviousEpisodes(allShowsByEpisodeType);

    //get all next episodes
    allNextEpisodes.then(episodes => {

      if (episodes.length < 1) {
        console.log('');
        console.log(chalk.yellow(`Couldn't find any info of next episode of show(s) matching '${showName}'`));
      }

      episodes.forEach(episode => {
        templates.nextEpisode(episode);
      });

      //in addition show all the matching shows of all previous episodes that has no next episode
      allPreviousEpisodes.then(episodes => {
        if (episodes.length > 0) {
          console.log('');
          console.log(chalk.red(`Show(s) matching '${showName}' that are either ended or have no update available yet!`));
          episodes.forEach(episode => {
            let message = chalk.grey.bold(episode.show.name);
            templates.previousEpisode(episode, message);
          });
        }
      });
    });
  })
  .catch(e => {
    spinner.stop();
    console.log(chalk.bold.red(e.message));
  });
