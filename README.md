# tvst

[![ci](https://github.com/shahriar1/tvst/actions/workflows/ci.yml/badge.svg)](https://github.com/shahriar1/tvst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/tvst.svg)](https://www.npmjs.com/package/tvst)
[![node](https://img.shields.io/node/v/tvst.svg)](https://nodejs.org)
[![docker](https://img.shields.io/docker/v/shahriar1only/tvst?label=docker)](https://hub.docker.com/r/shahriar1only/tvst)

> TV Shows Tracker (TVST) on the command line

Find out what is on tonight, when the next episode of a show airs in *your* time zone, and keep a list of favorites, all from the terminal. Data comes from the [TVMaze API](https://www.tvmaze.com/api).

![tvst in a terminal](https://raw.githubusercontent.com/shahriar1/tvst/master/tvst.gif)

## Install

Requires Node.js 22.12 or newer.

```bash
npm install -g tvst
```

Or run it without installing:

```bash
npx tvst schedule tonight
```

### Docker

No Node.js? There is an image on [Docker Hub](https://hub.docker.com/r/shahriar1only/tvst) for amd64 and arm64:

```bash
docker run --rm -it -e TZ=Europe/London -v tvst:/data shahriar1only/tvst schedule tonight
```

Set `TZ` to your own zone, otherwise "your time" is the container's UTC. Favorites are kept in the `tvst` volume, mounted at `/data`. `-it` gives you prompts and colors. An alias makes it feel native:

```bash
alias tvst='docker run --rm -it -e TZ=Europe/London -v tvst:/data shahriar1only/tvst'
```

Upgrading from 0.x? See [Upgrading from 0.x](#upgrading-from-0x). Your old commands still work.

## Quick start

```bash
tvst schedule                      # what's on TV today (US)
tvst schedule tomorrow -c GB       # tomorrow in the UK
tvst schedule --web                # today's streaming releases (Netflix, Apple TV, ...)
tvst next severance                # when the next episode airs, in network and local time
tvst info the bear                 # summary, genres, rating, next and last episode
tvst fav add severance             # keep a favorites list...
tvst fav upcoming                  # ...and see what's coming up this week
```

Show names never need quotes: `tvst next game of thrones` works.

## Commands

```
tvst schedule [date]     list the TV schedule for a day (default: today, US)
tvst next <name>         when the next episode of a show airs        (alias: ne)
tvst prev <name>         when the most recent episode aired          (alias: pe)
tvst search <name>       search TVMaze for shows by name
tvst info <name>         details about a show
tvst fav add [name]      add show(s) to your favorites
tvst fav list            your favorites with their next and last episodes
tvst fav remove [name]   remove show(s) from your favorites          (alias: rm)
tvst fav upcoming        episodes of your favorites airing soon
```

Every command accepts `--json` for machine-readable output and `--no-color` to turn colors off. `tvst help <command>` shows the options for a command.

### schedule

```bash
tvst schedule                     # today
tvst schedule tomorrow
tvst schedule yesterday
tvst schedule "next friday"
tvst schedule "feb 14"
tvst schedule 2026-09-14
tvst schedule today -c GB         # another country (ISO code)
tvst schedule -f "drag race"      # only shows whose name matches
tvst schedule --web               # web / streaming releases instead of broadcast TV
tvst schedule --sort name         # sort by name instead of air time
```

The table shows the air time in the network's own zone and, when it differs, in yours. The filter is forgiving about typos and gets stricter the more words you give it.

### next / prev

```bash
tvst next severance
tvst next the bear -n 1           # only the best match
tvst prev game of thrones
```

All matching shows are looked up. Shows with an upcoming episode get a full card; shows that have ended, or have nothing scheduled yet, are listed compactly with their last episode.

### search / info

```bash
tvst search westworld
tvst info westworld
tvst info --id 1371               # look up by TVMaze id
```

### fav

```bash
tvst fav add severance            # one match: added straight away; several: pick from a list
tvst fav add game of thrones --first   # take the best match without asking
tvst fav add --id 82,44933        # by TVMaze id
tvst fav list                     # next and last episode of every favorite
tvst fav list --offline           # what's saved, no network
tvst fav upcoming                 # the next 7 days
tvst fav upcoming --days 30
tvst fav remove severance
tvst fav remove --all
```

When the terminal is not interactive (a pipe, a script, CI) `fav add` and `fav remove` never prompt: they print the candidates and exit with code 2 so you can rerun with `--id`, `--first`, or an explicit name.

## Scripting with --json

```bash
tvst schedule --json | jq '.episodes[] | select(.show.network == "HBO") | .show.name'
tvst next severance --json | jq -r '.shows[0].next.airs.local'
tvst fav upcoming --days 3 --json | jq -r '.episodes[] | "\(.episode.airs.local)  \(.show.name)  \(.episode.code)"'
```

With `--json`, stdout is always valid JSON and errors go to stderr as `{"error": "...", "code": n}`.

### Exit codes

| code | meaning |
|-----:|---------|
| 0 | success |
| 1 | nothing found (no matching show, empty schedule, nothing upcoming) |
| 2 | usage error (bad date, unknown command, missing argument) |
| 3 | could not reach TVMaze |
| 130 | cancelled at a prompt |

## Configuration

Favorites are stored in a small JSON file in your OS config directory:

- macOS: `~/Library/Preferences/tvst/config.json`
- Linux: `~/.config/tvst/config.json` (or `$XDG_CONFIG_HOME/tvst/config.json`)
- Windows: `%APPDATA%\tvst\Config\config.json`
- Docker: `/data/config.json` (mount a volume there)

`tvst fav list --json` prints the exact path.

Environment variables:

| variable | effect |
|----------|--------|
| `NO_COLOR` | disable colors (same as `--no-color`) |
| `FORCE_COLOR` | force colors even when piping |
| `TZ` | the zone "your time" is shown in (defaults to the system zone) |
| `TVST_CONFIG_DIR` | store favorites somewhere else |
| `TVST_API_BASE` | use another TVMaze-compatible API base URL (used by the tests) |

## Upgrading from 0.x

- `ne`, `pe`, `fav-add`, `fav-list` and `fav-remove` all still work as aliases of the new commands.
- Favorites moved out of the package folder into your config directory, so they now survive `npm update`. If an old `storage/tvst-fav.json` is still around it is imported the first time you run 1.0.
- Node.js 22.12 or newer is required.
- Unknown commands and bad arguments now exit with code 2 instead of printing help and exiting 0.

## Development

```bash
nvm use               # Node 24, see .nvmrc
npm install
npm run dev -- schedule tomorrow   # run from source
npm test              # build, then unit + offline e2e tests
npm run test:live     # a few checks against the real API
npm run lint          # biome
npm run format
```

The end-to-end tests run the built CLI against a local server that replays recorded TVMaze responses from `tests/fixtures`. To refresh them run `npm run fixtures:record` (add `-- --all` to re-record everything).

Releases are published from GitHub Actions on a `v*` tag. The npm publish uses trusted publishing, so no token is involved; the Docker Hub push uses an access token stored in the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets.

## Credits

TV data is provided by the [TVMaze API](https://www.tvmaze.com/api) under the [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) license.

## License

MIT © [Shahriar Mahmood](https://github.com/shahriar1)
