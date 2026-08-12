# Discord Activity spike

A throwaway one-screen app that proves the four things about Discord Activities that can only be
checked by running inside the real Discord client. It is **not** the game — no board, no lobby,
no database.

It renders a checklist that goes green step by step, so when something fails you can see exactly
which step and why:

1. SDK constructed (`frame_id` present)
2. Handshake with the Discord client
3. `authorize()` returned a code
4. Code exchanged **server-side** for a token
5. `authenticate()` accepted the token
6. Participants fetched
7. WebSocket open through the proxy
8. Echo frame received back

## Why the token exchange lives in `apps/realtime`

`POST /discord/token` there holds the client secret. It must never be shipped to the browser,
so the browser sends only the short-lived `code` and gets back an access token.

## Setup

### 1. Discord Developer Portal

- Create an app. Under **Installation → Installation Contexts**, enable **both** User Install and
  Guild Install.
- **OAuth2 → Redirects**: add `https://127.0.0.1` (a placeholder; the SDK flow doesn't use it).
- **Activities → Settings**: tick **Enable Activities**.
- Copy the **Client ID** and **Client Secret**.

### 2. Env

`apps/discord/.env.local` (copy from `.env.example`):

```
VITE_DISCORD_CLIENT_ID=<client id>
```

`apps/realtime/.env` — append these two:

```
DISCORD_CLIENT_ID=<client id>
DISCORD_CLIENT_SECRET=<client secret>
```

Both are optional in `packages/env/src/server.ts`, so the rest of the stack keeps booting
without them; `/discord/token` returns `503 {"error":"unconfigured"}` until they're set.

### 3. Run it — three terminals

```
cd apps/realtime && bun run dev      # :8080
cd apps/discord  && bun run dev      # :5173
cloudflared tunnel --url http://localhost:5173
```

Discord will not load `localhost`, hence the tunnel. Vite is configured with
`allowedHosts: true` and `hmr.clientPort: 443` so the tunnel host isn't rejected.

The realtime server also needs to be publicly reachable — either point at the deployed one or
run a second tunnel for `:8080`.

### 4. URL Mappings

**Activities → URL Mappings**:

| Prefix | Target |
| --- | --- |
| `/` | the `:5173` tunnel host |
| `/rt` | the realtime host |
| `/cdn` | `cdn.discordapp.com` |

`/cdn` is what makes **avatars** work. Every external host is `blocked:csp` inside the iframe,
Discord's own CDN included, so `<Avatar>` builds its URLs against `AVATAR_BASE` (`/cdn` by
default) rather than hitting `cdn.discordapp.com` directly. Override with `VITE_AVATAR_BASE` if
you map a different prefix.

The same applies to **sounds** — `@100masu/ui` reads them from `soundBaseUrl`, which currently
defaults to `cdn.mikn.dev`. The real screens will need a mapping for that too, or the game will
be silent inside Discord.

### 5. Launch

Join a voice channel in a server where the app is installed, open the activity shelf, and
launch it.

## Passing looks like

- All eight steps green.
- `instanceId`, `channelId`, `guildId` all populated.
- Your Discord display name shown under **authenticated as** — it came from the OAuth exchange,
  not from the client.
- A second person joining the voice channel appears in **Participants** with no reload.
- **echo frames** ticking up once a second.
- No `blocked:csp` in the console.

## Result — passed, 2026-08-12

All eight steps green, echo frames flowing. The screen has since been rebuilt on `@100masu/ui`
(DaisyUI `synthwave`, shared `<Avatar>`), so relaunching now also proves the shared package
renders under Vite and that avatars survive the CSP.

Recorded findings:

**The URL Mapping prefix is stripped in transit.** The client connects to
`wss://{clientId}.discordsays.com/rt/channels/ping`, and the realtime server only registers
`/channels/ping`. Elysia matches routes exactly, so the socket could only have opened if the
proxy removed `/rt` before forwarding. Consequence for the real build: the existing WS hooks
need their **base host** swapped, not a path prefix added — `usePlayChannel`,
`useLobbyChannel` and `useSpectateChannel` all build their URL from the single
`NEXT_PUBLIC_REALTIME_BACKEND_URL`, so this stays a one-value change.

**`patchUrlMappings` was not needed.** Everything is requested with same-origin relative URLs,
which resolve to the proxied origin on their own. The SDK helper is only required for
third-party libraries that hardcode external hosts.

**WebSockets survive the proxy in both directions**, confirming the whole realtime layer
transfers unchanged.

## Cleaning up afterwards

`ws /channels/ping` in `apps/realtime/src/index.ts` exists only for this spike. Either delete
it or keep it deliberately as a dependency-free liveness probe — but don't leave it around by
accident. `POST /discord/token` is **not** throwaway; the real build needs it.
