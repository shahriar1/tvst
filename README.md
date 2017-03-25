# tvst [![Build Status](https://travis-ci.org/shahriar1/tvst.svg?branch=master)](https://travis-ci.org/shahriar1/tvst)

> TV Shows Tracker (TVST) on command line

[![asciicast](https://asciinema.org/a/59v8mewjzyqt09x5c8j3qwike.png)](https://asciinema.org/a/59v8mewjzyqt09x5c8j3qwike)


### Install

```
npm install -g tvst
```


### Usage

```

  Usage: tvst [options] [command]


  Commands:

    schedule <date>  Show list of TV shows of a specific date
    ne <show-name>   Date & Air time of next episode of a show
    pe <show-name>   Date & Air time of previous episode of a show
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
