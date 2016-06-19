const axios = require('axios');
const _ = require('lodash');
const moment = require('moment-timezone');
require('fuzzyset.js');

module.exports = {
    
    /**
     * fetch a URL
     *
     * @param {String} $url
     * @returns {axios.Promise}
     */
    fetch: function ($url) {
        return axios.get($url);
    },
    
    /**
     * fetch all shows of a country by date
     *
     * @param {moment} momentDate
     * @param {String} countryISO
     * @returns {axios.Promise}
     */
    fetchShowsByDate: function (momentDate, countryISO = 'US') {
        const requestString = 'http://api.tvmaze.com/schedule?country=' + countryISO + '&date=' + momentDate.tz('America/New_York').format('YYYY-MM-DD');
        return this.fetch(requestString);
    },
    
    /**
     * format daily shows
     *
     * @param {Array} showsResponse
     * @returns {Promise}
     */
    formatDailyShows: function (showsResponse) {

        return Promise.resolve().then(() => {

            if (!_.isArray(showsResponse.data)) {
                throw new Error('Not a valid daily API response of shows!');
            }

            let responseData = showsResponse.data;
            let allShows = [];
            responseData.forEach(show => {
                
                let timeZone = show.show.network.country ? show.show.network.country.timezone : show.webChannel.country ? show.webChannel.country.timezone : 'America/New_York';
                let timeStamp = show.airstamp ? moment(show.airstamp) : '';
                //set default timezone
                moment.tz.setDefault(timeZone);
                
                allShows.push({
                    tvMazeId: show.show.id,
                    name: show.show.name,
                    season: show.season ? show.season : '',
                    episode: show.number ? show.number : '',
                    premiered: show.show.premiered ? show.show.premiered : '',
                    network: show.show.network.name ? show.show.network.name : show.webChannel ? show.webChannel.name : '',
                    country: show.show.network.country ? show.show.network.country : show.show.webChannel.country ? show.show.webChannel.country : {},
                    timeZone: timeZone,
                    timestamp: timeStamp,
                    time: show.airtime ? moment(show.airtime, 'HH:mm') : timeStamp,
                    status: show.show.status ? show.show.status : '',
                    runtime: show.show.runtime ? show.show.runtime : '',
                    link: show._links.self ? show._links.self.href : '',
                    externalIds: show.show.externals ? show.show.externals : {},
                    images: show.show.image ? show.show.image : {},
                    schedule: show.show.schedule ? show.show.schedule : {},
                    summary: show.show.summary ? show.show.summary : '',
                    type: show.show.type ? show.show.type : '',
                    genres: show.show.genres ? show.show.genres : [],
                    previousEpisode: show.show._links.previousepisode ? show.show._links.previousepisode.href : '',
                    nextEpisode: show.show._links.nextepisode ? show.show._links.nextepisode.href : '',
                });
            });
            
            return _.sortBy(allShows, o => {
                return o.name;
            });
            
        }).catch(e => Promise.reject(e));
        
    },
    
    /**
     * full text search in daily shows
     *
     * @param {Array} shows
     * @param {string} searchBy
     * @param {String} value
     * @returns {Array}
     */
    dailyShowsFullTexSearch: function (shows, searchBy, value) {
        
        //based on number of words we can set min score as a eligible show 
        const length = _.words(value).length;
        let minScore = 1;
        
        switch (length) {
            case 1:
                minScore = 0.21;
                break;
            case 2:
                minScore = 0.31;
                break;
            default:
                minScore = 0.51;
        }
        
        return _.filter(shows, ob => {
            let fuzzySet = FuzzySet([ob[searchBy]]);
            let matchedArray = fuzzySet.get(value);
            
            return matchedArray !== null && matchedArray[0][0] > minScore;
        });
    },
    
    /**
     * format a show
     *
     * @param {Object} show
     * @returns {Object}
     */
    formatShow: function (show) {
        return {
            tvRageId: show.id,
            name: show.name,
            premiered: show.premiered ? show.premiered : '',
            network: show.network ? show.network.name : show.webChannel ? show.webChannel.name : '',
            country: show.network ? show.network.country : show.webChannel ? show.webChannel.country : {},
            status: show.status ? show.status : '',
            runtime: show.runtime ? show.runtime : '',
            link: show._links.self ? show._links.self.href : '',
            externalIds: show.externals ? show.externals : {},
            images: show.image ? show.image : {},
            schedule: show.schedule ? show.schedule : {},
            summary: show.summary ? show.summary : '',
            type: show.type ? show.type : '',
            genres: show.genres ? show.genres : [],
            previousEpisode: show._links.previousepisode ? show._links.previousepisode.href : '',
            nextEpisode: show._links.nextepisode ? show._links.nextepisode.href : '',
        };
    },
    
    /**
     * format a episode
     *
     * @param {Object} episode
     * @param {Object} show
     * @returns {Object}
     */
    formatEpisode: function (episode, show) {
        
        let timeZone = show.country ? show.country.timezone : 'America/New_York';
        moment.tz.setDefault(timeZone);
        
        return {
            name: episode.name ? episode.name : '',
            season: episode.season ? episode.season : '',
            episode: episode.number ? episode.number : '',
            timestamp: episode.airstamp ? moment(episode.airstamp) : '',
            link: episode._links.self ? episode._links.self.href : '',
        };
    },
    
    /**
     * fetch shows by show name
     *
     * @param {String} showName
     * @returns {Promise}
     */
    fetchShowsByKeyword: function (showName) {
        let requestUrl = 'http://api.tvmaze.com/search/shows?q=' + showName;
        let _this = this;
        
        return _this.fetch(requestUrl)
            .then(response => {
                let tvShows = response.data;
                let tvShowsArray = tvShows.map( show => {
                    return _this.formatShow(show.show);
                });
                return Promise.resolve(tvShowsArray);
            })
            .catch(e => Promise.reject(e.data));
    },
    
    /**
     * format shows by episode type(based on whether it has next episode or not)
     *
     * @param {Array} shows
     * @returns {Array}
     */
    formatShowsByEpisodeType: function (shows) {
        let allShows = [];
        allShows.nextEpisodes = [];
        allShows.previousEpisodes = [];
        shows.forEach( show =>  {
            if (show.nextEpisode) {
                allShows.nextEpisodes.push(show);
            } else {
                allShows.previousEpisodes.push(show);
            }
        });
        
        return allShows;
    },
    
    /**
     * get next episodes
     *
     * @param {Array} shows
     * @returns {Promise}
     */
    getNextEpisodes: function (shows) {
        let _this = this;
        let nextEpisodesLinks = shows.nextEpisodes.map( show => {
            return _this.fetch(show.nextEpisode);
        });
        
        return Promise.all(nextEpisodesLinks).then( episodes =>  {
            return episodes.map( (episodeResponse, index) =>  {
                let showDetails = [];
                showDetails.show = shows.nextEpisodes[index];
                showDetails.episode = _this.formatEpisode(episodeResponse.data, showDetails.show);
                return showDetails;
            });
        });
    },
    
    /**
     * get previous episode
     *
     * @param {Array} shows
     * @returns {Promise}
     */
    getPreviousEpisodes: function (shows) {
        let _this = this;
        
        let previousEpisodesLinks = shows.previousEpisodes.map( show => {
            if (show.previousEpisode) {
                return _this.fetch(show.previousEpisode);
            }
        });
        
        //removed undefined value from array if any
        previousEpisodesLinks = previousEpisodesLinks.filter(n => typeof n !== 'undefined');
        
        return Promise.all(previousEpisodesLinks).then( (episodes) => {
            return episodes.map((episodeResponse, index) => {
                let showDetails = [];
                showDetails.show = shows.previousEpisodes[index];
                showDetails.episode = _this.formatEpisode(episodeResponse.data, showDetails.show);
                return showDetails;
            });
        });
    }
};
