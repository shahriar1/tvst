# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-08

### Added

- An official Docker image, `shahriar1only/tvst` on Docker Hub, built for linux/amd64 and linux/arm64. Favorites live in `/data`, pass `TZ` for local times.

## [1.0.0] - 2026-09-07

A ground-up rewrite. The command line surface from 0.x keeps working, everything underneath is new.

### Added

- `search <name>` lists matching shows with network, country, status and rating.
- `info <name>` (or `info --id <id>`) prints a detail card: summary, genres, rating, runtime, schedule, next and last episode, links.
- `schedule --web` shows streaming and web channel releases (Netflix, Apple TV, ...).
- `schedule` understands natural dates: `today`, `tomorrow`, `yesterday`, `next friday`, `feb 14`, and ISO dates. New `--sort name|time` option.
- `fav upcoming [--days N]` shows a single timeline of your favorites' next episodes.
- `fav add --id`, `fav add --first`, `fav remove --all`, `fav list --offline` so the favorites commands work without prompts in scripts.
- `--json` on every command, with errors reported on stderr as JSON.
- `--no-color`, plus `NO_COLOR` and `FORCE_COLOR` support.
- Meaningful exit codes: 0 ok, 1 nothing found, 2 usage error, 3 network failure, 130 cancelled.
- Tables shrink to fit the terminal width.
- Automatic retry with backoff when TVMaze rate-limits (HTTP 429).

### Changed

- Rewritten in TypeScript (ESM), bundled with tsup; commander 15, luxon, @clack/prompts, native fetch.
- Requires Node.js 22.12 or newer.
- Commands renamed to `next`, `prev`, `fav add`, `fav list`, `fav remove`. The old `ne`, `pe`, `fav-add`, `fav-list`, `fav-remove` names remain as aliases.
- Favorites are stored in the OS config directory instead of inside the package folder, so they survive upgrades. An existing `storage/tvst-fav.json` is imported once.
- Air times are derived from TVMaze's `airstamp`; the network's own time and your local time are both shown, and shows on global streaming services no longer have a US time zone assumed.
- ISO dates given to `schedule` no longer drift by a day depending on your time zone.
- API calls use HTTPS.
- Tests run offline against recorded fixtures; CI runs on GitHub Actions across Node 22, 24 and 26.
- Releases are published through npm trusted publishing from GitHub Actions.

### Fixed

- Piping output into `head` or a pager no longer crashes with EPIPE.
- `--version` reports the real package version.
- Unknown commands exit with a non-zero code.

### Removed

- Babel, yarn, jshint, Travis CI, axios, moment, inquirer, date.js, fs-promise, fuzzyset.js, lodash.

## [0.3.1] - 2022-06-27

Dependency updates only. Last release of the 0.x line.

[1.1.0]: https://github.com/shahriar1/tvst/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/shahriar1/tvst/compare/v0.2.2...v1.0.0
[0.3.1]: https://github.com/shahriar1/tvst/releases/tag/v0.2.2
