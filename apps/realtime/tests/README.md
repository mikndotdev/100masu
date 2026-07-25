# Realtime end-to-end tests

These are **integration** tests, not unit tests: they talk to a running realtime
server, a real Postgres and a real Redis. They are deliberately not named
`*.test.ts`, so a bare `bun test` will not pick them up and fail in an
environment without those services.

Each test seeds its own lobby and deletes it again in a `finally`, so they clean
up after themselves even when an assertion fails.

## Prerequisites

- Migrations applied (`bun run db:migrate` from the repo root)
- `DATABASE_URL` and `REDIS_URL` available to the process
- A realtime server running

## Single instance

```sh
cd apps/realtime
bun run dev                # terminal 1
bun run test:e2e           # terminal 2
```

Covers: progress deltas, answer-secrecy, cross-player write rejection, finish
and placement, Postgres persistence, both check modes, the spectate gate, and
regressions for the bugs found in review (Redis echo reverting keystrokes,
flush-on-disconnect, re-notifying a reconnecting finished player, and rejecting
a check on an incomplete grid).

## Two instances (Redis pub/sub fanout)

Proves that players connected to _different_ server instances still see each
other — the path that only Redis covers.

```sh
cd apps/realtime
PORT=8080 bun run src/index.ts   # terminal 1
PORT=8081 bun run src/index.ts   # terminal 2
bun run test:e2e:cross           # terminal 3
```

Override the targets with `REALTIME_URL`, or `REALTIME_URL_A` / `REALTIME_URL_B`.
