import prisma from "@100masu/db";

import {
  correctFor,
  HEADERS,
  lastProgressFor,
  openSocket,
  requireServer,
  Results,
  seedLobby,
  wait,
  type SeededLobby,
} from "./helpers";

const BASE = process.env.REALTIME_URL ?? "ws://localhost:8080";
const results = new Results();

await requireServer(BASE);

async function lateJoin() {
  const seeded: SeededLobby = await seedLobby("INPUT");
  const [alice, bob] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

  try {
    const a = openSocket(BASE, "/channels/play", alice.Id);
    const b = openSocket(BASE, "/channels/play", bob.Id);
    results.check(await a.ready, "late: alice socket opens");
    results.check(await b.ready, "late: bob socket opens");
    await wait(400);

    const carol = await prisma.player.create({
      data: { LobbyId: seeded.lobby.Id, Name: "Carol", Status: "PLAYING" },
    });

    const c = openSocket(BASE, "/channels/play", carol.Id);
    results.check(await c.ready, "late: joiner's socket opens");
    await wait(600);

    results.check(!c.isClosed(), "late: joiner is not disconnected by the stale lobby cache");

    const snapshot = c.msgs.find((m) => m.type === "game") as
      | { board: { top: number[]; left: number[] }; players: { playerId: string }[] }
      | undefined;
    results.check(!!snapshot, "late: joiner receives a game snapshot");
    results.check(
      snapshot?.board.top.join(",") === HEADERS.join(","),
      "late: joiner gets the in-flight board, not a fresh one",
    );
    results.check(
      snapshot?.players.some((p) => p.playerId === alice.Id) === true &&
        snapshot?.players.some((p) => p.playerId === bob.Id) === true,
      "late: joiner sees the players already in the game",
    );
    results.check(
      snapshot?.players.some((p) => p.playerId === carol.Id) === true,
      "late: joiner appears in their own snapshot",
    );

    results.check(
      !!lastProgressFor(a, carol.Id),
      "late: alice is told about the joiner before they type",
    );
    results.check(
      !!lastProgressFor(b, carol.Id),
      "late: bob is told about the joiner before they type",
    );

    c.ws.send(JSON.stringify({ type: "cell", index: 0, value: correctFor(0) }));
    c.ws.send(JSON.stringify({ type: "commit", index: 0 }));
    await wait(500);
    results.check(
      lastProgressFor(a, carol.Id)?.cells.startsWith("2") === true,
      "late: joiner's answers fan out to the incumbents",
    );

    a.ws.send(JSON.stringify({ type: "cell", index: 5, value: correctFor(5) }));
    a.ws.send(JSON.stringify({ type: "commit", index: 5 }));
    await wait(500);
    results.check(
      lastProgressFor(c, alice.Id)?.cells[5] === "2",
      "late: joiner receives the incumbents' answers",
    );

    const persisted = await prisma.player.findUnique({ where: { Id: carol.Id } });
    results.check(
      (persisted?.Answers as { cells?: string[] } | null)?.cells?.[0] === correctFor(0),
      "late: joiner's answers are persisted to the database",
    );

    a.ws.close();
    b.ws.close();
    c.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

async function unknownPlayer() {
  const socket = openSocket(BASE, "/channels/play", "definitely-not-a-player-id");
  await socket.ready;
  await wait(500);
  results.check(
    socket.isClosed() && !socket.msgs.some((m) => m.type === "game"),
    "late: an unknown player id is still rejected",
  );
  socket.ws.close();
}

await lateJoin();
await unknownPlayer();

process.exit(results.report() > 0 ? 1 : 0);
