# tvst [![Build Status](https://travis-ci.org/shahriar1/tvst.svg?branch=master)](https://travis-ci.org/shahriar1/tvst)

> TV Shows Tracker (TVST) on command line

![TVST command line](tvst.gif)


## Table of contents
  * [Install](#install)
  * [Upgrade](#upgrade)
  * [Usage](#usage)
    * [Schedule](#schedule)
      * [Examples](#schedule-examples)
        * [See all shows of today](#see-all-shows-of-today)
        * [See all shows of tomorrow](#see-all-shows-of-tomorrow)
        * [See all shows of yesterday](#see-all-shows-of-yesterday)
        * [See all shows of a particular date](#see-all-shows-of-a-particular-date)
        * [See if tomorrow has a episode of a particular tv show](#see-if-a-tomorrow-has-episode-of-a-particular-tv-show)
        * [See today's schedule of a particular country](#see-todays-schedule-of-a-particular-country)
    * [Next Episode](#next-episode)
      * [Examples](#next-episode-examples)
        * [See next episode's details of a particular show](#see-next-episode-details-of-a-particular-show)
    * [Previous Episode](#previous-episode)
      * [Examples](#previous-episode-examples)
        * [See previous episode's details of a particular show](#see-previous-episode-details-of-a-particular-show)
    * [Favorite Shows](#favorite-shows)
      * [Examples](#favroite-shows-examples)
        * [Add show(s) as your favorite](#add-shows-as-your-favorite)
        * [Remove show(s) from your favorite](#remove-shows-from-your-favorite)
        * [See schedules of all of your favorite shows](#get-schedule-of-all-of-your-favorite-shows)
    * [Help](#help)
    * [Version](#version)
  * [Credits](#credits)
  * [License](#license)


## Install <a name="install"></a>

Install with [npm](https://www.npmjs.com/):

```bash
npm install -g tvst
```
## Upgrade <a name="upgrade"></a>

```bash
npm update -g tvst
```

### Usage <a name="usage"></a>

```

  Usage: tvst [options] [command]


  Commands:

    schedule <date>  Show list of TV shows of a specific date
    ne <show-name>   Date & Air time of next episode of a show
    pe <show-name>   Date & Air time of previous episode of a show
    fav-add          Add TV shows in your favorite list
    fav-list         Show list of your favorite shows
    fav-remove       Remove show(s) from your favorite shows
    help [cmd]       display help for [cmd]

  TV Shows Tracker (TVST) On Command Line - For Developers

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```   


## Schedule
```
tvst schedule <date>
```

#### Usage

```
$ tvst schedule --help

  Usage: tvst-schedule [options]

  Options:

    -h, --help              output usage information
    -c --country <country>  ISO Country Code - eg. US or GB etc.
    -f --filter <filter>    Filter By Show Name
```

#### Example:

Get today's schedule - `tvst schedule today`

Get yesterday's schedule - `tvst schedule yesterday`

Get tomorrow's schedule - `tvst schedule tomorrow`

Get a specific dates schedule - `tvst schedule '2016-06-14'`

See if tomorrow has episode of Game Of Thrones - `tvst schedule tomorrow -f 'game of thrones'`

Get today's schedule of a country - `tvst schedule today -c GB`




## Next Episode - ne
```
tvst ne <show-name>
```

#### Example

Get next episode schedule with details of a specific show - `tvst ne 'game of thrones'`

###### If you're not sure about spelling of a specific show name, just guess, it will return list of possible shows


###### If any show has no update of next episode then it returns details of previous episode



## Previous episode - pe


```
tvst pe <show-name>
```

#### Example

Get next episode schedule with details of a specific show - `tvst pe 'game of thrones'`

###### If you're not sure about spelling of a specific show name, just guess, it will return list of possible shows

####



### _More awesome features are in development_ :smile:


## Credits
###### [TVMaze API](http://tvmaze.com/api)



## License

The MIT @ [Shahriar Mahmood](https://github.com/shahriar1)
