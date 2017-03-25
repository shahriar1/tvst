import test from 'ava';
const utils = require('../src/utils');
const moment = require('moment-timezone');
const _ = require('lodash');
moment.tz.setDefault('America/New_York');


test('fetch - should return data according to requested url', t => {
    return utils.fetch('http://api.tvmaze.com/shows/82').then(result => {
        t.is('OK', result.statusText);
        t.is(82, result.data.id);
        t.is('Game of Thrones', result.data.name);
    });
});


test('fetchShowsByDate - should return all shows of a date', t => {
    const showDate = moment('2016-02-02');
    return utils.fetchShowsByDate(showDate, 'US').then(result => {
        t.is('OK', result.statusText);
        t.true(result.data.length > 50);
    });
});

test('formatDailyShows - should return all daily shows in a nice format', t => {
    const showDate = moment('2016-02-01');
    return utils.fetchShowsByDate(showDate, 'US').then(result => {
        utils.formatDailyShows(result)
            .then(function (shows) {
                t.true(shows.length > 50);
                let luciferEpisode = _.find(shows, {'name' : 'Lucifer'});
                t.is(luciferEpisode.name, 'Lucifer');
                t.is(luciferEpisode.network, 'FOX');
                t.is(luciferEpisode.season, 1);
                t.is(luciferEpisode.episode, 2);
                t.is(luciferEpisode.timestamp.format('YYYY-MM-DD'), '2016-02-01' );
                
                let wweRawEpisode = _.find(shows, {'name' : 'WWE Monday Night RAW'});
                t.is(wweRawEpisode.name, 'WWE Monday Night RAW');
                t.is(wweRawEpisode.network, 'USA Network');
                t.is(wweRawEpisode.season, 24);
                t.is(wweRawEpisode.episode, 21);
                t.is(wweRawEpisode.timestamp.format('YYYY-MM-DD'), '2016-02-01' );
            });
    });
});

test('formatDailyShows - should return all daily shows of a country', t => {
    const showDate = moment('2016-02-01');
    return utils.fetchShowsByDate(showDate, 'GB').then(result => {
        utils.formatDailyShows(result)
            .then(function (shows) {
                t.true(shows.length > 50);
                let hARDtalkEpisode = _.find(shows, {'name' : 'HARDtalk'});
                t.is(hARDtalkEpisode.name, 'HARDtalk');
                t.is(hARDtalkEpisode.country.code, 'GB');
                t.is(hARDtalkEpisode.network, 'BBC News');
                t.is(hARDtalkEpisode.season, 2016);
                t.is(hARDtalkEpisode.episode, 14);
                t.is(hARDtalkEpisode.timestamp.format('YYYY-MM-DD'), '2016-02-01' );

                let wantedDownUnderEpisode = _.find(shows, {'name' : 'Wanted Down Under'});

                t.is(wantedDownUnderEpisode.name, 'Wanted Down Under');
                t.is(wantedDownUnderEpisode.country.code, 'GB');
                t.is(wantedDownUnderEpisode.network, 'BBC One');
                t.is(wantedDownUnderEpisode.season, 10);
                t.is(wantedDownUnderEpisode.episode, 21);
                t.is(wantedDownUnderEpisode.timestamp.format('YYYY-MM-DD'), '2016-02-01' );
            });
    });
});


test('dailyShowsFullTexSearch - should return shows that matches the keyword', t => {
    const showDate = moment('2016-02-01');
    return utils.fetchShowsByDate(showDate).then(result => {
        utils.formatDailyShows(result)
            .then(function (shows) {
                t.true(shows.length > 50);
                let filteredEpisodes = utils.dailyShowsFullTexSearch(shows, 'name', 'Lucifer');
                t.true(filteredEpisodes.length < 5);
                let luciferEpisode = _.find(filteredEpisodes, {'name' : 'Lucifer'});
                t.is(luciferEpisode.name, 'Lucifer');
                t.is(luciferEpisode.season, 1);
                t.is(luciferEpisode.episode, 2);
                t.is(luciferEpisode.network, 'FOX');
            });
    });
});

test('formatShow - should return show according nice format', t => {
    return utils.fetch('http://api.tvmaze.com/shows/82').then(result => {
        let unformattedShow = result.data;
        let formattedShow = utils.formatShow(result.data);
        t.not('HBO', unformattedShow.network);
        t.falsy(unformattedShow.link);
        
        t.truthy(formattedShow.link);
        t.is('HBO', formattedShow.network);
        
    });
});



test('formatEpisode - should return episode according nice format', t => {
    return utils.fetch('http://api.tvmaze.com/shows/82').then(showResult => {
        let unformattedShow = showResult.data;
        
        return utils.fetch('http://api.tvmaze.com/episodes/729573').then(episodeResult => {
            let unformattedEpisode = episodeResult.data;
            let formattedShow = utils.formatEpisode(unformattedEpisode, showResult.data);

            t.not('HBO', unformattedShow.episode);
            t.falsy(unformattedShow.link);

            t.is(8, formattedShow.episode);
            t.truthy(formattedShow.link);
        });
    });
});



test('fetchShowsByKeyword - should return shows matching keyword', t => {
    return utils.fetchShowsByKeyword('Game of Thrones').then(result => {
        t.true(result.length > 0);

        let gOTShow = _.find(result, {'name' : 'Game of Thrones'});

        t.is(gOTShow.name, 'Game of Thrones');
        t.is(gOTShow.network, 'HBO');
        t.is(gOTShow.link, 'http://api.tvmaze.com/shows/82');
    });
});


test('formatShowsByEpisodeType - should return shows by episodes type', t => {
    return utils.fetchShowsByKeyword('Game').then(shows => {
        let showsByEpisodeType = utils.formatShowsByEpisodeType(shows);
        t.truthy(showsByEpisodeType['nextEpisodes']);
        t.truthy(showsByEpisodeType['previousEpisodes']);
    });
});

test('getNextEpisodes - should return shows matching keyword', async t => {
    return utils.fetchShowsByKeyword('Game').then(shows => {
        return Promise.resolve()
            .then( () => {
                return utils.formatShowsByEpisodeType(shows)
                
            })
            .then((showsByEpisodeType) => {
                return utils.getNextEpisodes(showsByEpisodeType);
            })
            .then(episodesResult => {
                episodesResult.forEach( episodeDetails => {
                    
                    t.truthy(episodeDetails.show.nextEpisode);
                    t.truthy(episodeDetails.episode.name);
                });
            })
        ;
    });
});

test('getNextEpisodes - should return shows matching keyword', async t => {
    return utils.fetchShowsByKeyword('Game').then(shows => {
        return Promise.resolve()
            .then( () => {
                return utils.formatShowsByEpisodeType(shows)

            })
            .then((showsByEpisodeType) => {
                return utils.getPreviousEpisodes(showsByEpisodeType);
            })
            .then(episodesResult => {
                episodesResult.forEach( episodeDetails => {

                    t.truthy(episodeDetails.show.previousEpisode);
                    t.truthy(episodeDetails.episode.name);
                });
            });
    });
});
