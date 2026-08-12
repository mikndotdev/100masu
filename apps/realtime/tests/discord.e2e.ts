import prisma from "@100masu/db";
import { GRID_SIZE } from "@100masu/game";

import { signPlayer } from "../src/discord";
import { HEADERS, requireServer, Results } from "./helpers";

const BASE = process.env.REALTIME_URL ?? "ws://localhost:8080";
const HTTP = BASE.replace(/^ws/, "http");
const results = new Results();

await requireServer(BASE);

type Seeded = Awaited<ReturnType<typeof seedDiscordLobby>>;

async function seedDiscordLobby(status: "OPEN" | "COMPLETED" = "OPEN") {
  const instanceId = `test-instance-${crypto.randomUUID()}`;
  const lobby = await prisma.lobby.create({
    data: {
      InviteCode: `D${Math.floor(Math.random() * 90000 + 10000)}`,
      DiscordInstanceId: instanceId,
      Status: status,
      AllowLateJoin: true,
      TopHeaders: status === "COMPLETED" ? HEADERS : [],
      LeftHeaders: status === "COMPLETED" ? HEADERS : [],
      StartedAt: status === "COMPLETED" ? new Date() : null,
      FinishedAt: status === "COMPLETED" ? new Date() : null,
      Players: {
        create: [
          { Name: "Host", IsHost: true, DiscordUserId: `u-${crypto.randomUUID()}` },
          { Name: "Guest", IsHost: false, DiscordUserId: `u-${crypto.randomUUID()}` },
        ],
      },
    },
    include: { Players: { orderBy: { JoinedAt: "asc" } } },
  });

  return {
    lobby,
    instanceId,
    host: lobby.Players[0]!,
    guest: lobby.Players[1]!,
    cleanup: async () => {
      const ids = [lobby.Id];
      const next = await prisma.lobby.findUnique({
        where: { Id: lobby.Id },
        select: { NextLobbyId: true },
      });
      if (next?.NextLobbyId) {
        ids.push(next.NextLobbyId);
      }
      await prisma.lobby.deleteMany({ where: { Id: { in: ids } } }).catch(() => undefined);
    },
  };
}

async function call(path: string, method: string, body: unknown) {
  const response = await fetch(`${HTTP}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

const settingsBody = (playerId: string) => ({
  playerId,
  token: signPlayer(playerId),
  op: "mul" as const,
  start: 3,
  order: "rand" as const,
  check: "end" as const,
});

async function settingsAuth() {
  const seeded: Seeded = await seedDiscordLobby();
  try {
    const guestDenied = await call("/discord/settings", "PATCH", settingsBody(seeded.guest.Id));
    results.check(guestDenied.status === 403, "settings: a non-host is refused while closed");

    const guestToggle = await call("/discord/lobby", "PATCH", {
      playerId: seeded.guest.Id,
      token: signPlayer(seeded.guest.Id),
      open: true,
    });
    results.check(guestToggle.status === 403, "settings: a non-host cannot open the switch");

    const opened = await call("/discord/lobby", "PATCH", {
      playerId: seeded.host.Id,
      token: signPlayer(seeded.host.Id),
      open: true,
    });
    results.check(opened.status === 200, "settings: the host can open the switch");

    const guestAllowed = await call("/discord/settings", "PATCH", settingsBody(seeded.guest.Id));
    results.check(guestAllowed.status === 200, "settings: a non-host is allowed once opened");

    const lobby = await prisma.lobby.findUnique({ where: { Id: seeded.lobby.Id } });
    results.check(
      lobby?.Op === "MUL" && lobby.StartNumber === 3 && lobby.Order === "RAND",
      "settings: the change actually persisted",
    );
    results.check(
      lobby?.EndNumber === 3 + GRID_SIZE - 1,
      `settings: EndNumber derived server-side (got ${lobby?.EndNumber})`,
    );
  } finally {
    await seeded.cleanup();
  }
}

async function startAuth() {
  const seeded: Seeded = await seedDiscordLobby();
  try {
    const guest = await call("/discord/start", "POST", {
      playerId: seeded.guest.Id,
      token: signPlayer(seeded.guest.Id),
    });
    results.check(guest.status === 403, "start: a non-host cannot start");

    const host = await call("/discord/start", "POST", {
      playerId: seeded.host.Id,
      token: signPlayer(seeded.host.Id),
    });
    results.check(host.status === 200, "start: the host can start");

    const lobby = await prisma.lobby.findUnique({ where: { Id: seeded.lobby.Id } });
    results.check(lobby?.Status === "IN_PROGRESS", "start: status flips to IN_PROGRESS");
    results.check(
      lobby?.TopHeaders.length === GRID_SIZE && lobby.LeftHeaders.length === GRID_SIZE,
      "start: a board is generated",
    );
    results.check(
      (lobby?.StartedAt?.getTime() ?? 0) > Date.now(),
      "start: StartedAt is in the future for the countdown",
    );

    const again = await call("/discord/start", "POST", {
      playerId: seeded.host.Id,
      token: signPlayer(seeded.host.Id),
    });
    results.check(again.status === 409, "start: starting twice is rejected");

    const late = await call("/discord/settings", "PATCH", settingsBody(seeded.host.Id));
    results.check(late.status === 409, "settings: refused once the game has started");
  } finally {
    await seeded.cleanup();
  }
}

async function rematchFlow() {
  const open: Seeded = await seedDiscordLobby("OPEN");
  try {
    const tooEarly = await call("/discord/rematch", "POST", {
      playerId: open.host.Id,
      token: signPlayer(open.host.Id),
    });
    results.check(tooEarly.status === 409, "rematch: refused while the game is unfinished");
  } finally {
    await open.cleanup();
  }

  const done: Seeded = await seedDiscordLobby("COMPLETED");
  try {
    const first = await call("/discord/rematch", "POST", {
      playerId: done.host.Id,
      token: signPlayer(done.host.Id),
    });
    results.check(first.status === 200, "rematch: accepted on a completed lobby");

    const nextId = (first.body as { lobbyId?: string } | null)?.lobbyId;
    results.check(typeof nextId === "string", "rematch: returns the new lobby id");

    const previous = await prisma.lobby.findUnique({ where: { Id: done.lobby.Id } });
    results.check(
      previous?.DiscordInstanceId === null,
      "rematch: the old lobby releases the instance id",
    );
    results.check(previous?.NextLobbyId === nextId, "rematch: the old lobby points at the new one");

    const survivors = await prisma.player.count({ where: { LobbyId: done.lobby.Id } });
    results.check(survivors === 2, `rematch: previous players intact (got ${survivors})`);

    const next = await prisma.lobby.findUnique({ where: { Id: nextId! } });
    results.check(
      next?.DiscordInstanceId === done.instanceId,
      "rematch: the new lobby takes over the instance id",
    );
    results.check(next?.Status === "OPEN", "rematch: the new lobby starts open");
    results.check(next?.Op === done.lobby.Op, "rematch: settings carry over");

    const repeat = await call("/discord/rematch", "POST", {
      playerId: done.host.Id,
      token: signPlayer(done.host.Id),
    });
    results.check(
      repeat.status === 200 && (repeat.body as { lobbyId?: string } | null)?.lobbyId === nextId,
      "rematch: a second click is idempotent",
    );
  } finally {
    await done.cleanup();
  }
}

async function hostImpersonation() {
  const seeded: Seeded = await seedDiscordLobby();
  try {
    const noToken = await fetch(`${HTTP}/discord/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId: seeded.host.Id }),
    });
    results.check(
      noToken.status >= 400,
      `bypass: starting with no token is rejected (got ${noToken.status})`,
    );

    const guestToken = await call("/discord/start", "POST", {
      playerId: seeded.host.Id,
      token: signPlayer(seeded.guest.Id),
    });
    results.check(
      guestToken.status >= 400,
      `bypass: the host's id signed by another player is rejected (got ${guestToken.status})`,
    );

    const forged = await call("/discord/start", "POST", {
      playerId: seeded.host.Id,
      token: "0".repeat(64),
    });
    results.check(forged.status >= 400, "bypass: a forged token is rejected");

    const stillOpen = await prisma.lobby.findUnique({ where: { Id: seeded.lobby.Id } });
    results.check(stillOpen?.Status === "OPEN", "bypass: none of those actually started the game");

    const genuine = await call("/discord/start", "POST", {
      playerId: seeded.host.Id,
      token: signPlayer(seeded.host.Id),
    });
    results.check(genuine.status === 200, "bypass: the correctly signed host still succeeds");
  } finally {
    await seeded.cleanup();
  }
}

async function unknownPlayer() {
  const missing = await call("/discord/start", "POST", {
    playerId: "not-a-player",
    token: signPlayer("not-a-player"),
  });
  results.check(missing.status === 404, "auth: an unknown player id is rejected");
}

await settingsAuth();
await startAuth();
await rematchFlow();
await hostImpersonation();
await unknownPlayer();

process.exit(results.report() > 0 ? 1 : 0);
