# tvst

TV Shows Tracker on the command line. Find out what is on tonight, when the next episode of a show airs in your time zone, and keep a list of favorites. Data comes from the [TVMaze API](https://www.tvmaze.com/api).

## Quick reference

- **Maintained by:** [Shahriar Mahmood](https://github.com/shahriar1)
- **Source and issues:** [github.com/shahriar1/tvst](https://github.com/shahriar1/tvst)
- **Also available on npm:** [`npm install -g tvst`](https://www.npmjs.com/package/tvst)
- **Supported architectures:** `linux/amd64`, `linux/arm64`
- **Base image:** `node:24-alpine`, runs as the unprivileged `node` user

## Supported tags

- `1.1.0`, `1.1`, `1`, `latest`

Tags follow the npm package version. `latest` always points at the newest stable release.

## How to use this image

Run a command directly. The container prints its output and exits:

```bash
docker run --rm -e TZ=Europe/London shahriar1only/tvst schedule tonight
```

Set `TZ` to your own time zone. Without it, every "your time" is shown in UTC.

### Make it feel native

Add an alias and use `tvst` like any other command:

```bash
alias tvst='docker run --rm -it -e TZ=Europe/London -v tvst:/data shahriar1only/tvst'

tvst schedule                      # what is on TV today (US)
tvst schedule tomorrow -c GB       # tomorrow in the UK
tvst schedule --web                # today's streaming releases
tvst next severance                # when the next episode airs, network and local time
tvst info the bear                 # summary, genres, rating, next and last episode
tvst fav add severance             # keep a favorites list...
tvst fav upcoming                  # ...and see what is coming up this week
```

`-it` enables the interactive prompts and colors. Without a terminal attached, ambiguous searches print the candidates and exit instead of prompting.

### Keep your favorites

Favorites are stored in `/data/config.json`. Mount a volume there so they survive between runs:

```bash
docker run --rm -v tvst:/data shahriar1only/tvst fav add severance --first
docker run --rm -v tvst:/data shahriar1only/tvst fav list
```

### Scripting

Every command accepts `--json` for machine-readable output, and colors are disabled automatically when the output is not a terminal:

```bash
docker run --rm shahriar1only/tvst next severance --json | jq '.shows[0].previous.code'
```

Exit codes: `0` success, `1` nothing found, `2` usage error, `3` could not reach TVMaze, `130` cancelled at a prompt.

## Configuration

| Variable | Effect |
|----------|--------|
| `TZ` | Time zone that "your time" is shown in. Defaults to UTC inside the container. |
| `TVST_CONFIG_DIR` | Where favorites are stored. Defaults to `/data`. |
| `NO_COLOR` | Disable colors. |
| `FORCE_COLOR` | Force colors when piping output. |
| `TVST_API_BASE` | Use another TVMaze-compatible API base URL. |

The image has no other configuration. TVMaze needs no API key.

## Image details

- Multi-stage build from the [repository Dockerfile](https://github.com/shahriar1/tvst/blob/master/Dockerfile).
- Zone data (`tzdata`) is included so any IANA `TZ` value resolves.
- Runs as `node` (uid 1000). `/data` is owned by that user and declared as a volume.
- Each release is built and pushed by [GitHub Actions](https://github.com/shahriar1/tvst/actions/workflows/release.yml) with SLSA provenance and an SBOM attached to the manifest.
- Outbound network access is only needed for `api.tvmaze.com`.

## License

tvst is released under the [MIT License](https://github.com/shahriar1/tvst/blob/master/LICENSE). TV data is provided by the [TVMaze API](https://www.tvmaze.com/api) under the [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) license.
