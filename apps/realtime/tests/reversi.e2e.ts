import prisma from "@100masu/db";
import { allocateInviteCode, newGameData } from "@100masu/db/reversi";
import { createIdentity, hashIdentity } from "@100masu/reversi/identity";
import type { StateMessage } from "@100masu/reversi/protocol";

import { openSocket, requireServer, Results, until, wait } from "./helpers";

const A = process.env.REALTIME_URL_A ?? "ws://localhost:8080";
const B = process.env.REALTIME_URL_B ?? "ws://localhost:8081";
const results = new Results();

await requireServer(A);
await requireServer(B);

function connect(base: string, gameId: string, identity?: string) {
  const socket = openSocket(base, "/reversi/channels/game", {
    game: gameId,
    ...(identity ? { id: identity } : {}),
  });
  const states = () => socket.msgs.filter((m) => m.type === "state") as unknown as StateMessage[];
  return {
    ...socket,
    send: (body: unknown) => socket.ws.send(JSON.stringify(body)),
    state: () => states().at(-1),
    errors: () => socket.msgs.filter((m) => m.type === "error").map((m) => m.code),
  };
}

async function seed(options: { board?: string; clockMs?: number } = {}) {
  const black = createIdentity();
  const white = createIdentity();
  const data = newGameData({
    inviteCode: await allocateInviteCode(),
    clock: options.clockMs ? { baseMs: options.clockMs, incrementMs: 0 } : null,
    seats: [
      { Color: "B", Name: "Alice", IdentityHash: hashIdentity(black) },
      { Color: "W", Name: "Bob", IdentityHash: hashIdentity(white) },
    ],
    now: new Date(),
  });
  const game = await prisma.reversiGame.create({
    data: { ...data, ...(options.board ? { Board: options.board } : {}) },
  });
  return { game, black, white };
}

const cleanupIds: string[] = [];

try {
  {
    const { game, black, white } = await seed();
    cleanupIds.push(game.Id);
    const alice = connect(A, game.Id, black);
    const bob = connect(B, game.Id, white);
    const watcher = connect(A, game.Id);
    const stranger = connect(B, game.Id, createIdentity());
    results.check(
      (await alice.ready) && (await bob.ready),
      "both players connect across instances",
    );
    results.check((await watcher.ready) && (await stranger.ready), "spectators connect");

    await until(() => !!alice.state() && !!bob.state() && !!watcher.state(), 3000);
    results.check(alice.state()?.you === "B", "alice is seated as black");
    results.check(bob.state()?.you === "W", "bob is seated as white");
    results.check(watcher.state()?.you === null, "no identity means spectator");
    await until(() => !!stranger.state(), 3000);
    results.check(stranger.state()?.you === null, "an unknown identity is a spectator");
    await until(() => bob.state()?.seats.B?.online === true, 3000);
    results.check(bob.state()?.seats.B?.online === true, "presence: bob sees alice online");

    bob.send({ type: "move", idx: 37, version: 0 });
    await until(() => bob.errors().includes("not_your_turn"), 3000);
    results.check(bob.errors().includes("not_your_turn"), "out-of-turn move is rejected");

    alice.send({ type: "move", idx: 0, version: 0 });
    await until(() => alice.errors().includes("illegal"), 3000);
    results.check(alice.errors().includes("illegal"), "illegal move is rejected");

    alice.send({ type: "move", idx: 19, version: 7 });
    await until(() => alice.errors().includes("stale"), 3000);
    results.check(alice.errors().includes("stale"), "stale version is rejected");

    watcher.send({ type: "move", idx: 19, version: 0 });
    await until(() => watcher.errors().includes("spectator"), 3000);
    results.check(watcher.errors().includes("spectator"), "spectators cannot move");

    alice.send({ type: "move", idx: 19, version: 0 });
    await until(() => bob.state()?.version === 1, 3000);
    const after = bob.state();
    results.check(after?.turn === "W", "cross-instance: turn passes to white");
    results.check(
      JSON.stringify(after?.lastMove) === JSON.stringify({ idx: 19, color: "B", flips: [[27]] }),
      "cross-instance: last move carries grouped flips",
    );
    await until(() => watcher.state()?.version === 1, 3000);
    results.check(watcher.state()?.board === after?.board, "spectator receives the move");

    alice.ws.close();
    await until(() => bob.state()?.seats.B?.online === false, 3000);
    results.check(bob.state()?.seats.B?.online === false, "presence: disconnect is seen");

    bob.send({ type: "resign" });
    await until(() => bob.state()?.status === "finished", 3000);
    results.check(
      bob.state()?.result?.winner === "B" && bob.state()?.result?.reason === "resign",
      "resign ends the game for the opponent",
    );

    const alice2 = connect(A, game.Id, black);
    await alice2.ready;
    await until(() => !!alice2.state(), 3000);
    results.check(alice2.state()?.status === "finished", "reconnect receives the final state");

    alice2.send({ type: "rematch" });
    await until(() => bob.state()?.seats.B?.rematch === true, 3000);
    results.check(bob.state()?.nextGameId === null, "one rematch request does not start a game");
    bob.send({ type: "rematch" });
    alice2.send({ type: "rematch" });
    await until(() => !!bob.state()?.nextGameId && !!alice2.state()?.nextGameId, 3000);
    const nextId = bob.state()?.nextGameId;
    results.check(!!nextId, "both requests start a rematch");
    if (nextId) {
      cleanupIds.push(nextId);
      const rematch = await prisma.reversiGame.findUnique({
        where: { Id: nextId },
        include: { Players: true },
      });
      const aliceSeat = rematch?.Players.find((player) => player.Name === "Alice");
      results.check(rematch?.Status === "playing", "rematch starts immediately");
      results.check(aliceSeat?.Color === "W", "rematch swaps colors");
      const count = await prisma.reversiGame.count({
        where: { Players: { some: { IdentityHash: hashIdentity(black) } } },
      });
      results.check(count === 2, `exactly one rematch game is created (got ${count - 1})`);

      const aliceNext = connect(B, nextId, black);
      await aliceNext.ready;
      await until(() => !!aliceNext.state(), 3000);
      results.check(aliceNext.state()?.you === "W", "the same identity is seated in the rematch");
      aliceNext.ws.close();
    }

    for (const socket of [alice2, bob, watcher, stranger]) {
      socket.ws.close();
    }
  }

  {
    const board = [
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBW",
      "BBBBBW..",
    ].join("");
    const { game, black } = await seed({ board });
    cleanupIds.push(game.Id);
    const alice = connect(A, game.Id, black);
    await alice.ready;
    await until(() => !!alice.state(), 3000);

    alice.send({ type: "move", idx: 62, version: 0 });
    await until(() => alice.state()?.version === 1, 3000);
    results.check(alice.state()?.turn === "B", "white has no move, so black moves again");

    alice.send({ type: "move", idx: 63, version: 1 });
    await until(() => alice.state()?.status === "finished", 3000);
    results.check(
      alice.state()?.result?.reason === "normal" && alice.state()?.result?.winner === "B",
      "the game ends when nobody can move",
    );
    alice.ws.close();
  }

  {
    const { game, black, white } = await seed({ clockMs: 1500 });
    cleanupIds.push(game.Id);
    const alice = connect(A, game.Id, black);
    const bob = connect(B, game.Id, white);
    await alice.ready;
    await bob.ready;
    await wait(2200);
    await until(() => bob.state()?.status === "finished", 3000);
    results.check(
      bob.state()?.result?.reason === "timeout" && bob.state()?.result?.winner === "W",
      "the clock flags the side to move",
    );
    results.check(bob.state()?.clock?.B === 0, "a flagged clock reads zero");
    const row = await prisma.reversiGame.findUnique({ where: { Id: game.Id } });
    results.check(
      row?.Version === 1,
      `timeout is committed exactly once (version ${row?.Version})`,
    );
    alice.ws.close();
    bob.ws.close();
  }

  {
    const { game, white } = await seed({ clockMs: 1000 });
    cleanupIds.push(game.Id);
    const bob = connect(A, game.Id, white);
    await bob.ready;
    await until(() => !!bob.state(), 3000);
    await prisma.reversiGame.update({
      where: { Id: game.Id },
      data: { TurnStartedAt: new Date(Date.now() + 700) },
    });
    await until(() => bob.state()?.status === "finished", 4000);
    results.check(
      bob.state()?.result?.reason === "timeout",
      "a timer that fires before the real deadline is re-armed",
    );
    bob.ws.close();
  }

  {
    const { game, black } = await seed({ clockMs: 500 });
    cleanupIds.push(game.Id);
    await wait(800);
    const alice = connect(B, game.Id, black);
    await alice.ready;
    await until(() => alice.state()?.status === "finished", 3000);
    results.check(
      alice.state()?.result?.reason === "timeout",
      "an expired clock is settled when someone connects",
    );
    alice.ws.close();
  }

  {
    const { game, black, white } = await seed();
    cleanupIds.push(game.Id);
    const bob = connect(A, game.Id, white);
    await bob.ready;
    await until(() => !!bob.state(), 3000);

    const flaky = new WebSocket(
      `${A}/reversi/channels/game?${new URLSearchParams({ game: game.Id, id: black })}`,
    );
    flaky.onopen = () => flaky.close();
    await wait(1500);
    results.check(
      bob.state()?.seats.B?.online === false,
      "a socket closed while opening does not leave its player online",
    );

    const tabA = connect(A, game.Id, black);
    const tabB = connect(B, game.Id, black);
    await tabA.ready;
    await tabB.ready;
    await until(() => bob.state()?.seats.B?.online === true, 3000);
    tabA.ws.close();
    await until(() => bob.state()?.seats.B?.online === false, 3000);
    results.check(
      bob.state()?.seats.B?.online === false,
      "closing one tab clears presence on that instance",
    );
    tabB.send({ type: "ping" });
    await until(() => bob.state()?.seats.B?.online === true, 3000);
    results.check(
      bob.state()?.seats.B?.online === true,
      "a ping from the remaining tab restores presence for the opponent",
    );
    tabB.ws.close();
    bob.ws.close();
  }
} finally {
  await prisma.reversiGame.deleteMany({ where: { Id: { in: cleanupIds } } });
}

process.exit(results.report() > 0 ? 1 : 0);
