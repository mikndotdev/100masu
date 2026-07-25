import prisma from "@100masu/db";

import {
  CELL_TOTAL,
  correctFor,
  fillBoard,
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

async function instantMode() {
  const seeded: SeededLobby = await seedLobby("INPUT");
  const [alice, bob] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

  try {
    const a = openSocket(BASE, "/channels/play", alice.Id);
    const b = openSocket(BASE, "/channels/play", bob.Id);
    results.check(await a.ready, "instant: alice socket opens");
    results.check(await b.ready, "instant: bob socket opens");
    await wait(400);

    results.check(
      a.msgs.some((m) => m.type === "game"),
      "instant: receives game snapshot with board",
    );

    a.ws.send(JSON.stringify({ type: "cell", index: 0, value: correctFor(0) }));
    await wait(500);

    const progress = lastProgressFor(b, alice.Id);
    results.check(!!progress, "instant: bob receives alice's progress delta");
    results.check(progress?.cells.startsWith("2") === true, "instant: first cell marked correct");

    // Bob's own answers may appear in his own snapshot; nobody else's ever may.
    const foreignAnswers = b.msgs.some((m) => {
      if (m.type === "game") {
        const game = m as { you?: { id?: string }; players?: unknown[] };
        return (
          game.you?.id !== bob.Id || (game.players ?? []).some((p) => "answers" in (p as object))
        );
      }
      return "answers" in m;
    });
    results.check(!foreignAnswers, "SECURITY: no other player's answers in play payloads");

    b.ws.send(JSON.stringify({ type: "cell", index: 5, value: correctFor(5) }));
    await wait(500);
    results.check(
      lastProgressFor(b, alice.Id)?.cells[5] === "0",
      "SECURITY: a player cannot write to another player's grid",
    );

    fillBoard(a);
    await wait(1500);
    const finished = b.msgs.find((m) => m.type === "finished") as
      | { playerId: string; placement: number }
      | undefined;
    results.check(
      finished?.playerId === alice.Id && finished.placement === 1,
      "instant: finishing emits placement 1",
    );

    const saved = await prisma.player.findUnique({ where: { Id: alice.Id } });
    results.check(saved?.CorrectCount === CELL_TOTAL, "persist: CorrectCount reaches Postgres");
    results.check(saved?.FinishedAt !== null, "persist: FinishedAt written");
    const cells = (saved?.Answers as { cells?: string[] } | null)?.cells ?? [];
    results.check(cells[0] === correctFor(0), "persist: answers written to Postgres");

    const spectateBob = openSocket(BASE, "/channels/spectate", bob.Id);
    await spectateBob.ready;
    await wait(700);
    results.check(
      spectateBob.isClosed() || spectateBob.msgs.length === 0,
      "SECURITY: spectate refused for an unfinished player",
    );

    const spectateAlice = openSocket(BASE, "/channels/spectate", alice.Id);
    results.check(await spectateAlice.ready, "spectate: finished player admitted");
    await wait(700);
    const snapshot = spectateAlice.msgs.find((m) => m.type === "spectate") as
      | { players: { answers: string[] }[] }
      | undefined;
    results.check(
      !!snapshot && snapshot.players.some((p) => p.answers.some((v) => v !== "")),
      "spectate: real answers delivered to a finished player",
    );

    a.ws.close();
    b.ws.close();
    spectateAlice.ws.close();
    spectateBob.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

async function endMode() {
  const seeded = await seedLobby("END");
  const [alice, bob] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

  try {
    const a = openSocket(BASE, "/channels/play", alice.Id);
    const b = openSocket(BASE, "/channels/play", bob.Id);
    await a.ready;
    await b.ready;
    await wait(400);

    // regression: the server must reject a check on an incomplete grid
    a.ws.send(JSON.stringify({ type: "cell", index: 0, value: correctFor(0) }));
    await wait(400);
    a.ws.send(JSON.stringify({ type: "check" }));
    await wait(700);
    results.check(
      !a.msgs.some((m) => m.type === "checkResult"),
      "end mode: check on an incomplete grid is rejected",
    );

    fillBoard(a);
    await wait(1500);

    const progress = lastProgressFor(b, alice.Id);
    results.check(
      !!progress && !/[23]/.test(progress.cells),
      "end mode: opponents see filled-only, never correctness",
    );
    results.check(
      !b.msgs.some((m) => m.type === "finished"),
      "end mode: filling the grid does not finish you",
    );

    a.ws.send(JSON.stringify({ type: "check" }));
    await wait(900);
    results.check(
      (a.msgs.find((m) => m.type === "checkResult") as { solved?: boolean } | undefined)?.solved ===
        true,
      "end mode: checkResult reports solved",
    );
    results.check(
      b.msgs.some((m) => m.type === "finished"),
      "end mode: finishes only after an explicit check",
    );

    a.ws.close();
    b.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

async function regressions() {
  const seeded = await seedLobby("INPUT");
  const [alice, bob] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

  try {
    const a = openSocket(BASE, "/channels/play", alice.Id);
    const b = openSocket(BASE, "/channels/play", bob.Id);
    await a.ready;
    await b.ready;
    await wait(400);

    // The Redis echo must not revert rapid consecutive keystrokes.
    for (let index = 0; index < 12; index++) {
      a.ws.send(JSON.stringify({ type: "cell", index, value: correctFor(index) }));
    }
    await wait(1500);
    const progress = lastProgressFor(b, alice.Id);
    results.check(
      progress?.correct === 12,
      `regression: redis echo does not revert keystrokes (correct=${progress?.correct}, want 12)`,
    );
    results.check(
      progress?.cells.slice(0, 12) === "2".repeat(12),
      "regression: every rapid cell stays marked correct",
    );

    // Pending debounced answers must be flushed when the socket closes.
    a.ws.send(JSON.stringify({ type: "cell", index: 50, value: correctFor(50) }));
    a.ws.close();
    await wait(1200);
    const saved = await prisma.player.findUnique({ where: { Id: alice.Id } });
    const cells = (saved?.Answers as { cells?: string[] } | null)?.cells ?? [];
    results.check(
      cells[50] === correctFor(50),
      "regression: answers are flushed to Postgres on disconnect",
    );

    // A reconnecting finished player must be told they already finished.
    fillBoard(b);
    await wait(1500);
    b.ws.close();
    await wait(300);
    const rejoin = openSocket(BASE, "/channels/play", bob.Id);
    await rejoin.ready;
    await wait(800);
    results.check(
      rejoin.msgs.some((m) => m.type === "finished" && m.playerId === bob.Id),
      "regression: reconnecting finished player re-receives finished",
    );
    rejoin.ws.close();
  } finally {
    await seeded.cleanup();
  }
}

await instantMode();
await endMode();
await regressions();

process.exit(results.report() > 0 ? 1 : 0);
