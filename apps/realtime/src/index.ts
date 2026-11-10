import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { masu, startMasu } from "./games/masu";
import { reversi, startReversi } from "./games/reversi";

const app = new Elysia()
  .use(cors())
  .get("/", () => ({ hello: "Bun👋" }))
  .ws("/channels/ping", {
    message(ws) {
      ws.send({ type: "pong", serverNow: Date.now() });
    },
  })
  .use(masu)
  .use(reversi);

await startMasu();
await startReversi();

const server = app.listen(Number(process.env.PORT ?? 8080));

console.log(`Listening on ${server.server!.url}`);
