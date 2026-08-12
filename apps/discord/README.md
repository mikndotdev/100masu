# 100masu — Discord Activity

The multiplayer game as a Discord voice-channel Activity. The voice channel _is_ the lobby:
`instanceId` keys it, players are Discord users, and there are no invite codes, no captcha, no
cookies and no name entry.

Gameplay is the same server-authoritative engine the website uses — `apps/realtime` plus
`@100masu/game` — and every component comes from `@100masu/ui`. This app only adds the identity
layer and three screens.

## Screens

- **Setup** — shared settings form, participant list, Start. The first person in is host; a
  switch lets them open settings to everyone. Start stays with the host.
- **Play** — countdown, board, opponents pane, leaderboard, win animation.
- **Result** — placement, times, spectate carousel, and Play again.

## Why the endpoints live in `apps/realtime`

This app has no backend of its own, and the client secret must never reach the browser. So
`apps/realtime` owns:

| Route                     | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| `POST /discord/session`   | exchange the code, verify identity via `users/@me`, upsert lobby + player |
| `PATCH /discord/settings` | change settings (host, or anyone when settings are open)                  |
| `PATCH /discord/lobby`    | host toggles the open-settings switch                                     |
| `POST /discord/start`     | host starts; generates the board                                          |
| `POST /discord/rematch`   | new round bound to the same voice channel                                 |

**Identity is verified server-side.** The browser never tells us who it is — the server exchanges
the code, calls `users/@me` with the resulting token, and trusts only that. A client cannot claim
another Discord user.

**Host transfer.** If the host's lobby socket closes while the lobby is still open, the server
promotes a random _connected_ player after a 10s grace period, cancelled if they reconnect.
Promoting a player who had already left would strand the badge on someone absent and deadlock
Start, so only connected players are eligible.

## Rich presence

The activity requests `rpc.activities.write` alongside `identify` and `guilds`, and pushes the
player's game status via `setActivity`:

```
● 100masu
   Addition · 1–10          details
   42 / 100 correct         state   (Discord appends "(3 of 10)" from party.size)
   03:12 elapsed            timestamps.start
```

`timestamps.start` and `party.size` are rendered by Discord itself, so the elapsed counter stays
accurate with no updates at all. Only the score line is ever pushed, and that is **deduped and
throttled to one update per 5s with a trailing flush**. Discord doesn't publish the activity
rate limit, so the design stays well under any plausible one. Presence text follows the player's
selected language.

**Adding this scope means everyone re-consents.** `prompt: "none"` can only skip the dialog when
the existing grant already covers every requested scope, so testers will see the consent screen
once more after this change.

**A refused scope must not brick the activity.** `authorize()` runs before anything else, so a
failure there would leave a permanently stuck loading screen. It therefore authorizes with the
presence scope and, on failure, **retries once with the base scopes** and runs with presence
disabled — visible as `presenceEnabled: false` and in the console breadcrumb. Losing presence is
acceptable; losing the game is not. `setActivity` errors are swallowed for the same reason.

## Setup

### 1. Discord Developer Portal

- Create an app. Under **Installation → Installation Contexts**, enable **both** User Install and
  Guild Install.
- **OAuth2 → Redirects**: add `https://127.0.0.1` (a placeholder; the SDK flow doesn't use it).
- **Activities → Settings**: tick **Enable Activities**.
- Copy the **Client ID** and **Client Secret**.

### 2. Env

`apps/discord/.env` (or `.env.local` — Vite reads both):

```
VITE_DISCORD_CLIENT_ID=<client id>
```

`apps/realtime/.env`:

```
DISCORD_CLIENT_ID=<client id>
DISCORD_CLIENT_SECRET=<client secret>
```

Both are optional in `packages/env/src/server.ts`, so the rest of the stack keeps booting without
them; `/discord/session` returns `503 {"error":"unconfigured"}` until they're set.

### 3. Run it — three terminals

```
cd apps/realtime && bun run dev      # :8080
cd apps/discord  && bun run dev      # :5173
cloudflared tunnel --url http://localhost:5173
```

Discord will not load `localhost`, hence the tunnel. Vite is configured with
`allowedHosts: true` and `hmr.clientPort: 443` so the tunnel host isn't rejected. The realtime
server also needs to be publicly reachable — point at the deployed one, or run a second tunnel.

### 4. URL Mappings

**Activities → URL Mappings**. Every external host is `blocked:csp` inside the iframe, Discord's
own CDN included, so all four rows are required:

| Prefix        | Target                  | Without it             |
| ------------- | ----------------------- | ---------------------- |
| `/`           | the `:5173` tunnel host | nothing loads          |
| `/rt`         | the realtime host       | no gameplay            |
| `/cdn`        | `cdn.discordapp.com`    | no avatars             |
| `/cdn-sounds` | `cdn.mikn.dev`          | **the game is silent** |

Override the defaults with `VITE_AVATAR_BASE` and `VITE_SOUND_BASE` if you map other prefixes.

### 5. Launch

Join a voice channel in a server where the app is installed, open the activity shelf, and launch.

## Recorded findings from the spike

**The URL Mapping prefix is stripped in transit.** The client connects to
`wss://{clientId}.discordsays.com/rt/channels/play`, and the realtime server only registers
`/channels/play`. Elysia matches routes exactly, so the socket could only open if the proxy
removed `/rt` first. Hence the hooks take a **base host**, not a path prefix.

**`patchUrlMappings` was not needed.** Everything is requested with same-origin relative URLs,
which resolve to the proxied origin on their own. The SDK helper is only for third-party
libraries that hardcode external hosts.

**WebSockets survive the proxy in both directions**, which is what let the whole realtime layer
transfer unchanged.
