# tvst

[![ci](https://github.com/shahriar1/tvst/actions/workflows/ci.yml/badge.svg)](https://github.com/shahriar1/tvst/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/tvst.svg)](https://www.npmjs.com/package/tvst)
[![node](https://img.shields.io/node/v/tvst.svg)](https://nodejs.org)
[![docker](https://img.shields.io/docker/v/shahriar1only/tvst?label=docker)](https://hub.docker.com/r/shahriar1only/tvst)
[![license](https://img.shields.io/npm/l/tvst.svg)](LICENSE)

**TV Shows Tracker (TVST) on the command line.**

Find out what is on tonight, when the next episode of a show airs in *your* time zone, and keep a list of favorites, all from the terminal. Data comes from the [TVMaze API](https://www.tvmaze.com/api).

![tvst in a terminal](https://raw.githubusercontent.com/shahriar1/tvst/master/tvst.gif)

## Features

- **Daily schedule** for any country, with natural-language dates (`tomorrow`, `next friday`, `feb 14`)
- **Streaming releases** from Netflix, Apple TV and other web channels, alongside broadcast TV
- **Next and previous episodes** of any show, shown in the network's time and in yours
- **Show details**: summary, genres, rating, runtime, schedule and links
- **Favorites** with a single timeline of everything airing in the coming days
- **Scriptable**: `--json` on every command, meaningful exit codes, no prompts when piped
- **Zero configuration**: no API key, no sign-up

## Installation

### npm

Requires [Node.js](https://nodejs.org) 22.12 or newer.

```bash
npm install -g tvst
```

Or run it without installing:

```bash
npx tvst schedule tonight
```

### Docker

An image is published to [Docker Hub](https://hub.docker.com/r/shahriar1only/tvst) for `linux/amd64` and `linux/arm64`. No Node.js required.

```bash
docker run --rm -it -e TZ=Europe/London -v tvst:/data shahriar1only/tvst schedule tonight
```

- `TZ` sets the zone "your time" is shown in; without it the container uses UTC.
- `-v tvst:/data` keeps favorites in a named volume between runs.
- `-it` enables prompts and colors.

A shell alias makes it feel native:

```bash
alias tvst='docker run --rm -it -e TZ=Europe/London -v tvst:/data shahriar1only/tvst'
```

Tags follow the npm release: `latest`, `1`, `1.1` and `1.1.0`.

## Usage

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

## Command reference

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

Global options: `--json` for machine-readable output, `--no-color` to turn colors off, `--version`. Run `tvst help <command>` for the options of any command.

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

All matching shows are looked up (five by default). Shows with an upcoming episode get a full card; shows that have ended, or have nothing scheduled yet, are listed compactly with their last episode.

### search / info

```bash
tvst search westworld
tvst search westworld -n 3        # limit the number of results
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

## Scripting

Every command accepts `--json`. With it, stdout is always valid JSON and errors go to stderr as `{"error": "...", "code": n}`.

```bash
tvst schedule --json | jq '.episodes[] | select(.show.network == "HBO") | .show.name'
tvst next severance --json | jq -r '.shows[0].next.airs.local'
tvst fav upcoming --days 3 --json | jq -r '.episodes[] | "\(.episode.airs.local)  \(.show.name)  \(.episode.code)"'
```

### Exit codes

| Code | Meaning |
|-----:|---------|
| 0 | Success |
| 1 | Nothing found (no matching show, empty schedule, nothing upcoming) |
| 2 | Usage error (bad date, unknown command, missing argument) |
| 3 | Could not reach TVMaze |
| 130 | Cancelled at a prompt |

## Configuration

Favorites are stored in a small JSON file in your OS config directory:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Preferences/tvst/config.json` |
| Linux | `~/.config/tvst/config.json` (or `$XDG_CONFIG_HOME/tvst/config.json`) |
| Windows | `%APPDATA%\tvst\Config\config.json` |
| Docker | `/data/config.json` (mount a volume there) |

`tvst fav list --json` prints the exact path.

### Environment variables

| Variable | Effect |
|----------|--------|
| `TZ` | The zone "your time" is shown in (defaults to the system zone) |
| `NO_COLOR` | Disable colors (same as `--no-color`) |
| `FORCE_COLOR` | Force colors even when piping |
| `TVST_CONFIG_DIR` | Store favorites somewhere else |
| `TVST_API_BASE` | Use another TVMaze-compatible API base URL (used by the tests) |

## Upgrading from 0.x

Your old commands still work. The changes worth knowing about:

- `ne`, `pe`, `fav-add`, `fav-list` and `fav-remove` remain as aliases of the new commands.
- Favorites moved out of the package folder into your config directory, so they now survive `npm update`. An old `storage/tvst-fav.json` is imported the first time you run 1.x.
- Node.js 22.12 or newer is required.
- Unknown commands and bad arguments exit with code 2 instead of printing help and exiting 0.

See the [changelog](CHANGELOG.md) for the full list.

## Development

```bash
nvm use               # Node 24, see .nvmrc
npm install
npm run dev -- schedule tomorrow   # run from source
npm test              # build, then unit + offline e2e tests
npm run test:live     # a few checks against the real API
npm run lint          # biome
npm run format
npm run typecheck
```

The end-to-end tests run the built CLI against a local server that replays recorded TVMaze responses from `tests/fixtures`. To refresh them run `npm run fixtures:record` (add `-- --all` to re-record everything).

CI runs lint, typecheck, build and tests on Node 22, 24 and 26 on Linux, and Node 24 on Windows, and builds the Docker image. The live API smoke test is a manual workflow.

To build the image locally:

```bash
docker build -t tvst .
docker run --rm tvst --version
```

### Releasing

1. Update `CHANGELOG.md` and bump the version in `package.json`.
2. Commit and push a `v*` tag matching the version.

The release workflow publishes to npm via trusted publishing (no token involved), creates a GitHub release from the changelog entry, and pushes the multi-arch Docker image to Docker Hub using the `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets.

The demo GIF is recorded with [VHS](https://github.com/charmbracelet/vhs) from `tvst.tape`.

## Contributing

Issues and pull requests are welcome at [github.com/shahriar1/tvst](https://github.com/shahriar1/tvst/issues). Please run `npm run lint` and `npm test` before opening a PR.

## Credits

TV data is provided by the [TVMaze API](https://www.tvmaze.com/api) under the [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) license.

## License

[MIT](LICENSE) © [Shahriar Mahmood](https://github.com/shahriar1)
