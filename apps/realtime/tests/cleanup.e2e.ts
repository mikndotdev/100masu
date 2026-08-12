import prisma from "@100masu/db";

import { HEADERS, Results } from "./helpers";

const WEB = process.env.WEB_URL ?? "http://localhost:3001";
const SECRET = process.env.CRON_SECRET;
const results = new Results();

if (!SECRET) {
  console.error("\nCRON_SECRET is not set; the endpoint would reject every request.\n");
  process.exit(1);
}

async function seed(label: string, overrides: Record<string, unknown>, pingAt: Date | null) {
  const lobby = await prisma.lobby.create({
    data: {
      InviteCode: `C${Math.floor(Math.random() * 90000 + 10000)}`,
      Op: "ADD",
      StartNumber: 1,
      EndNumber: 10,
      Order: "SEQ",
      Check: "INPUT",
      TopHeaders: HEADERS,
      LeftHeaders: HEADERS,
      Players: { create: [{ Name: label, IsHost: true }] },
      ...overrides,
    },
    include: { Players: true },
  });
  await prisma.player.updateMany({
    where: { LobbyId: lobby.Id },
    data: { LastPingAt: pingAt },
  });
  return lobby;
}

const old = new Date(Date.now() - 1000 * 60 * 60 * 25);
const recent = new Date();

async function ageLobby(id: string, when: Date) {
  await prisma.$executeRaw`UPDATE "Lobby" SET "LastUpdated" = ${when} WHERE "Id" = ${id}`;
}

const fresh = await seed("Fresh", { Status: "OPEN" }, recent);
const completed = await seed("Completed", { Status: "COMPLETED", FinishedAt: old }, old);
const stale = await seed("Stale", { Status: "IN_PROGRESS", StartedAt: old }, old);
const activeButOld = await seed("ActiveOld", { Status: "IN_PROGRESS", StartedAt: old }, recent);

await ageLobby(completed.Id, old);
await ageLobby(stale.Id, old);
await ageLobby(activeButOld.Id, old);

try {
  const unauthorized = await fetch(`${WEB}/api/cron/cleanup`, {
    headers: { authorization: "Bearer wrong-secret" },
  });
  results.check(unauthorized.status === 401, "rejects a bad CRON_SECRET with 401");

  const noHeader = await fetch(`${WEB}/api/cron/cleanup`);
  results.check(noHeader.status === 401, "rejects a missing Authorization header with 401");

  const authorized = await fetch(`${WEB}/api/cron/cleanup`, {
    headers: { authorization: `Bearer ${SECRET}` },
  });
  results.check(authorized.ok, `accepts the correct secret (status ${authorized.status})`);

  const ids = [fresh.Id, completed.Id, stale.Id, activeButOld.Id];
  const surviving = await prisma.lobby.findMany({
    where: { Id: { in: ids } },
    select: { Id: true },
  });
  const alive = new Set(surviving.map((lobby) => lobby.Id));

  results.check(alive.has(fresh.Id), "keeps a fresh lobby");
  results.check(!alive.has(completed.Id), "deletes a lobby completed over 24h ago");
  results.check(!alive.has(stale.Id), "deletes a lobby inactive for over 24h");
  results.check(
    alive.has(activeButOld.Id),
    "keeps an old lobby whose players are still pinging (heartbeat wins)",
  );

  const orphans = await prisma.player.count({ where: { LobbyId: { in: [...ids] } } });
  const expected = await prisma.player.count({ where: { LobbyId: { in: [...alive] } } });
  results.check(orphans === expected, "players are cascade-deleted with their lobby");
} finally {
  await prisma.lobby
    .deleteMany({ where: { Id: { in: [fresh.Id, completed.Id, stale.Id, activeButOld.Id] } } })
    .catch(() => undefined);
}

process.exit(results.report() > 0 ? 1 : 0);
