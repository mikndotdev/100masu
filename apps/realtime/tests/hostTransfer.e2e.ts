import prisma from "@100masu/db";

import { HEADERS, requireServer, Results, wait } from "./helpers";

const BASE = process.env.REALTIME_URL ?? "ws://localhost:8080";
const results = new Results();

const GRACE_MS = 10_000;

await requireServer(BASE);

async function seed(status: "OPEN" | "IN_PROGRESS") {
  const lobby = await prisma.lobby.create({
    data: {
      InviteCode: `H${Math.floor(Math.random() * 90000 + 10000)}`,
      DiscordInstanceId: `test-instance-${crypto.randomUUID()}`,
      Status: status,
      AllowLateJoin: true,
      TopHeaders: status === "IN_PROGRESS" ? HEADERS : [],
      LeftHeaders: status === "IN_PROGRESS" ? HEADERS : [],
      StartedAt: status === "IN_PROGRESS" ? new Date() : null,
      Players: {
        create: [
          { Name: "Host", IsHost: true, DiscordUserId: `u-${crypto.randomUUID()}` },
          { Name: "Second", DiscordUserId: `u-${crypto.randomUUID()}` },
          { Name: "Third", DiscordUserId: `u-${crypto.randomUUID()}` },
        ],
      },
    },
    include: { Players: { orderBy: { JoinedAt: "asc" } } },
  });
  return {
    lobby,
    players: lobby.Players,
    cleanup: () => prisma.lobby.delete({ where: { Id: lobby.Id } }).catch(() => undefined),
  };
}

function openLobbySocket(playerId: string) {
  const ws = new WebSocket(`${BASE}/channels/lobby?player=${playerId}`);
  const msgs: Record<string, unknown>[] = [];
  ws.onmessage = (event) => {
    try {
      msgs.push(JSON.parse(String(event.data)) as Record<string, unknown>);
    } catch {
      return;
    }
  };
  return {
    ws,
    msgs,
    ready: new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(true);
      setTimeout(() => resolve(false), 4000);
    }),
  };
}

async function hostOf(lobbyId: string): Promise<string | null> {
  const host = await prisma.player.findFirst({
    where: { LobbyId: lobbyId, IsHost: true },
    select: { Id: true },
  });
  return host?.Id ?? null;
}

async function transfersToConnectedPlayer() {
  const seeded = await seed("OPEN");
  const [host, second, third] = seeded.players as [
    (typeof seeded.players)[0],
    (typeof seeded.players)[0],
    (typeof seeded.players)[0],
  ];

  try {
    const a = openLobbySocket(host.Id);
    const b = openLobbySocket(second.Id);
    const c = openLobbySocket(third.Id);
    results.check(await a.ready, "transfer: host socket opens");
    results.check(await b.ready, "transfer: second socket opens");
    results.check(await c.ready, "transfer: third socket opens");
    await wait(400);

    a.ws.close();
    await wait(1500);
    results.check(
      (await hostOf(seeded.lobby.Id)) === host.Id,
      "transfer: nothing changes before the grace period elapses",
    );

    await wait(GRACE_MS);
    const promoted = await hostOf(seeded.lobby.Id);
    results.check(
      promoted === second.Id || promoted === third.Id,
      `transfer: host moves to a connected player (got ${promoted === host.Id ? "the departed host" : "a connected player"})`,
    );

    const hosts = await prisma.player.count({
      where: { LobbyId: seeded.lobby.Id, IsHost: true },
    });
    results.check(hosts === 1, `transfer: exactly one host remains (got ${hosts})`);

    const broadcastSawIt = [...b.msgs, ...c.msgs].some((message) => {
      const players = (message as { players?: { id: string; isHost: boolean }[] }).players;
      return players?.some((player) => player.id === promoted && player.isHost);
    });
    results.check(broadcastSawIt, "transfer: the new host is broadcast to the remaining clients");

    b.ws.close();
    c.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

async function reconnectKeepsHost() {
  const seeded = await seed("OPEN");
  const [host, second] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

  try {
    const a = openLobbySocket(host.Id);
    const b = openLobbySocket(second.Id);
    await a.ready;
    await b.ready;
    await wait(400);

    a.ws.close();
    await wait(1000);
    const again = openLobbySocket(host.Id);
    results.check(await again.ready, "reconnect: host reconnects inside the grace window");

    await wait(GRACE_MS + 1500);
    results.check(
      (await hostOf(seeded.lobby.Id)) === host.Id,
      "reconnect: a host who returns in time keeps the badge",
    );

    again.ws.close();
    b.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

async function inProgressDoesNotTransfer() {
  const seeded = await seed("IN_PROGRESS");
  const [host, second] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

  try {
    const a = openLobbySocket(host.Id);
    const b = openLobbySocket(second.Id);
    await a.ready;
    await b.ready;
    await wait(400);

    a.ws.close();
    await wait(GRACE_MS + 1500);
    results.check(
      (await hostOf(seeded.lobby.Id)) === host.Id,
      "in-progress: host is not transferred once the game has started",
    );

    b.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

async function noConnectedPlayersLeavesItAlone() {
  const seeded = await seed("OPEN");
  const [host] = seeded.players as [(typeof seeded.players)[0]];

  try {
    const a = openLobbySocket(host.Id);
    await a.ready;
    await wait(400);

    a.ws.close();
    await wait(GRACE_MS + 1500);
    results.check(
      (await hostOf(seeded.lobby.Id)) === host.Id,
      "empty: with nobody connected the badge is left where it is",
    );
  } finally {
    await seeded.cleanup();
  }
}

await transfersToConnectedPlayer();
await reconnectKeepsHost();
await inProgressDoesNotTransfer();
await noConnectedPlayersLeavesItAlone();

process.exit(results.report() > 0 ? 1 : 0);
