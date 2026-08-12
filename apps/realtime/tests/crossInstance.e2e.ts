import {
  correctFor,
  fillBoard,
  lastProgressFor,
  openSocket,
  requireServer,
  Results,
  seedLobby,
  wait,
} from "./helpers";

const A = process.env.REALTIME_URL_A ?? "ws://localhost:8080";
const B = process.env.REALTIME_URL_B ?? "ws://localhost:8081";
const results = new Results();

await requireServer(A);
await requireServer(B);

const seeded = await seedLobby("INPUT");
const [alice, bob] = seeded.players as [(typeof seeded.players)[0], (typeof seeded.players)[0]];

try {
  const a = openSocket(A, "/channels/play", alice.Id);
  const b = openSocket(B, "/channels/play", bob.Id);
  results.check(await a.ready, "instance A accepts alice");
  results.check(await b.ready, "instance B accepts bob");
  await wait(600);

  a.ws.send(JSON.stringify({ type: "cell", index: 0, value: correctFor(0) }));
  a.ws.send(JSON.stringify({ type: "cell", index: 1, value: correctFor(1) }));
  await wait(1200);

  const progress = lastProgressFor(b, alice.Id);
  results.check(!!progress, "cross-instance: B receives A's progress");
  results.check(
    progress?.correct === 2,
    `cross-instance: correct count propagated (got ${progress?.correct})`,
  );
  results.check(
    progress?.cells.slice(0, 2) === "11",
    `cross-instance: uncommitted cells stay masked across instances (got ${progress?.cells.slice(0, 2)})`,
  );
  results.check(
    !b.msgs.some((m) => m.type === "progress" && "answers" in m),
    "SECURITY: no answers cross the instance boundary",
  );

  a.ws.send(JSON.stringify({ type: "commit", index: 0 }));
  a.ws.send(JSON.stringify({ type: "commit", index: 1 }));
  await wait(1200);
  results.check(
    lastProgressFor(b, alice.Id)?.cells.slice(0, 2) === "22",
    "cross-instance: committing reveals the verdict across instances",
  );

  fillBoard(a);
  await wait(1800);
  const finished = b.msgs.find((m) => m.type === "finished") as
    | { playerId: string; placement: number }
    | undefined;
  results.check(
    finished?.playerId === alice.Id && finished.placement === 1,
    `cross-instance: finish and placement propagated (got ${finished?.placement})`,
  );

  a.ws.close();
  b.ws.close();
} finally {
  await seeded.cleanup();
}

process.exit(results.report() > 0 ? 1 : 0);
