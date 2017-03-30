const ora = require('ora');
const chalk = require('chalk');
const utils = require('./utils');
const templates = require('./templates');
const inquirer = require('inquirer');
const fs = require('fs');

const spinner = ora('Wait for it...').start();

var formatAndShowFavoriteShows = function(showsResponse) {
  spinner.stop();

  if (showsResponse.length < 1) {
    console.log(chalk.yellow(`\nYou have no TV Shows added as your favorite shows! \nTry adding using the command ${chalk.green('tvst fav-add')}\n`));
  }
  const allShowsByEpisodeType = utils.formatShowsByEpisodeType(showsResponse);
  const allNextEpisodes = utils.getNextEpisodes(allShowsByEpisodeType);
  const allPreviousEpisodes = utils.getPreviousEpisodes(allShowsByEpisodeType);

  //get all next episodes
  allNextEpisodes.then(episodes => {

    episodes.forEach(episode => {
      templates.nextEpisode(episode);
    });

    //in addition show all the matching shows of all previous episodes that has no next episode
    allPreviousEpisodes.then(episodes => {
      if (episodes.length > 0) {
        console.log('');
        console.log(chalk.red(`Here, is your favorite show(s) that are either ended or have no update available yet!`));
        
        episodes.forEach(episode => {
          let message = chalk.grey.bold(episode.show.name);
          templates.previousEpisode(episode, message);
        });
      }
    });
  });
};

utils.formatBookmarkedShows(formatAndShowFavoriteShows);


