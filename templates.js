const chalk = require('chalk');
const Table = require('cli-table');
const moment = require('moment-timezone');

module.exports = {

    /**
     * print daily shows list
     * 
     * @param {Array} shows
     * @param {moment} showDate
     */
    dailyShowsList: function (shows, showDate) {
        if (shows.length < 1) {
            console.log(chalk.bold.red('No TV Shows Found at ' + showDate.format('MMM Do,YYYY')));
            return;
        }
        
        console.log(chalk.bold.green('List of TV  Shows at ' + showDate.format('MMM Do,YYYY')));
        let table = new Table();
        table.push([
            chalk.bold.green('Name'),
            chalk.bold.green('Details'),
            chalk.bold.green('Time')
        ]);
        
        shows.forEach(function (show, key) {

            let episodeDetails = `${chalk.grey.bold('Network:')} ${show.network}
${chalk.grey.bold('Season:')} ${show.season}
${chalk.grey.bold('Episode:')} ${show.episode}`;
            
            let showTime = `${chalk.grey.bold('Network Time:')} ${show.time.format('hh:mm A')}
${chalk.grey.bold('Your Time:')} ${show.time.tz(moment.tz.guess()).format('hh:mm A')}
${chalk.grey.bold('Countdown:')} ${show.timestamp.tz(moment.tz.guess()).fromNow()}`;
            
            table.push(
                [chalk.bold.blue(show.name.substring(0, 30)), episodeDetails, showTime]
            );
        });

        console.log(table.toString());
    },

    /**
     * print next episode
     * 
     * @param {Array} episodeDetails
     */
    nextEpisode: function (episodeDetails) {
        let show = episodeDetails.show;
        let episode = episodeDetails.episode;

        const nextEpisodeInfo = `
${chalk.green.bold(show.name)}
${chalk.bold('Network:')} ${show.network}
${chalk.bold('Episode Name:')} ${episode.name}
${chalk.bold('Details:')} ${chalk.grey.bold('Season')}: ${episode.season} ${chalk.grey.bold('Episode')}: ${episode.episode}
${chalk.bold('Network Time:')} ${episode.timestamp.format('dddd, MMMM Do YYYY, h:mm:ss a')}
${chalk.bold('User Time:')} ${episode.timestamp.tz(moment.tz.guess()).format('dddd, MMMM Do YYYY, h:mm:ss a')}
${chalk.bold('Countdown:')} ${episode.timestamp.fromNow()}`;

        console.log(nextEpisodeInfo);
    },

    /**
     * print previous episode details
     * 
     * @param {Array} episodeDetails
     * @param {String} message
     */
    previousEpisode: function (episodeDetails, message) {
        let show = episodeDetails.show;
        let episode = episodeDetails.episode;

        const previousEpisodeInfo = `
${message}
${chalk.bold('Network:')} ${show.network}
${chalk.bold('Last Episode Name:')} ${episode.name}
${chalk.bold('Details:')} ${chalk.grey.bold('Season')}: ${episode.season} ${chalk.grey.bold('Episode')}: ${episode.episode}
${chalk.bold('Network Time:')} ${episode.timestamp.format('dddd, MMMM Do YYYY, h:mm:ss a')}
${chalk.bold('User Time:')} ${episode.timestamp.tz(moment.tz.guess()).format('dddd, MMMM Do YYYY, h:mm:ss a')}
${chalk.bold('Aired Date:')} ${episode.timestamp.fromNow()}`;
        
        console.log(previousEpisodeInfo);
    },

    /**
     * Print no show found
     * 
     * @param {String} keyWord
     */
    noShowFound: function (keyWord) {
        console.log('\n' + chalk.red('No Show Found Matching ') + chalk.grey.bold(keyWord) + '\n');
    }
};
