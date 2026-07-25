import prisma from "@100masu/db";
import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

import {
  closePlaySocket,
  closeSpectateSocket,
  fanOutGameEvent,
  handlePlayMessage,
  openPlaySocket,
  openSpectateSocket,
  setLobbyChangeHandler,
  startPresenceFlush,
} from "./play";
import { INSTANCE_ID, subscribeToGameEvents, subscribeToLobbyEvents } from "./redis";

const OPERATION_FROM_DB = { ADD: "add", SUB: "sub", MUL: "mul", DIV: "div" } as const;
const CHECK_FROM_DB = { INPUT: "input", END: "end" } as const;

type LobbySocket = { id: string; send: (data: unknown) => void };

const rooms = new Map<string, Map<string, LobbySocket>>();
const socketLobby = new Map<string, string>();

async function resolveLobbyId(query: { id?: string; player?: string }): Promise<string | null> {
  if (query.id) {
    return query.id;
  }
  if (!query.player) {
    return null;
  }
  const player = await prisma.player.findUnique({
    where: { Id: query.player },
    select: { LobbyId: true },
  });
  return player?.LobbyId ?? null;
}

async function lobbySnapshot(lobbyId: string) {
  const lobby = await prisma.lobby.findUnique({
    where: { Id: lobbyId },
    include: { Players: { orderBy: { JoinedAt: "asc" } } },
  });

  if (!lobby) {
    return null;
  }

  return {
    type: "lobby" as const,
    lobbyId: lobby.Id,
    inviteCode: lobby.InviteCode,
    status: lobby.Status,
    allowLateJoin: lobby.AllowLateJoin,
    startedAt: lobby.StartedAt ? lobby.StartedAt.getTime() : null,
    op: OPERATION_FROM_DB[lobby.Op],
    check: CHECK_FROM_DB[lobby.Check],
    startNumber: lobby.StartNumber,
    endNumber: lobby.EndNumber,
    order: lobby.Order === "RAND" ? ("rand" as const) : ("seq" as const),
    players: lobby.Players.map((player) => ({
      id: player.Id,
      name: player.Name,
      isHost: player.IsHost,
      finishedAt: player.FinishedAt ? player.FinishedAt.getTime() : null,
      correctCount: player.CorrectCount,
      filledCount: player.FilledCount,
    })),
  };
}

async function broadcast(lobbyId: string) {
  const room = rooms.get(lobbyId);
  if (!room || room.size === 0) {
    return;
  }
  const snapshot = await lobbySnapshot(lobbyId);
  if (!snapshot) {
    return;
  }
  for (const socket of room.values()) {
    socket.send(snapshot);
  }
}

const app = new Elysia()
  .use(cors())
  .get("/", () => ({ hello: "Bun👋" }))
  .ws("/channels/lobby", {
    query: t.Object({ id: t.Optional(t.String()), player: t.Optional(t.String()) }),
    async open(ws) {
      const lobbyId = await resolveLobbyId(ws.data.query);
      if (!lobbyId) {
        ws.close();
        return;
      }
      let room = rooms.get(lobbyId);
      if (!room) {
        room = new Map();
        rooms.set(lobbyId, room);
      }
      room.set(ws.id, ws);
      socketLobby.set(ws.id, lobbyId);
      await broadcast(lobbyId);
    },
    async message(ws) {
      const lobbyId = socketLobby.get(ws.id);
      if (lobbyId) {
        await broadcast(lobbyId);
      }
    },
    close(ws) {
      const lobbyId = socketLobby.get(ws.id);
      socketLobby.delete(ws.id);
      if (!lobbyId) {
        return;
      }
      const room = rooms.get(lobbyId);
      if (!room) {
        return;
      }
      room.delete(ws.id);
      if (room.size === 0) {
        rooms.delete(lobbyId);
      }
    },
  })
  .ws("/channels/play", {
    query: t.Object({ id: t.String() }),
    body: t.Object({
      type: t.Union([
        t.Literal("cell"),
        t.Literal("commit"),
        t.Literal("check"),
        t.Literal("ping"),
      ]),
      index: t.Optional(t.Number()),
      value: t.Optional(t.String()),
    }),
    async open(ws) {
      await openPlaySocket(ws, ws.data.query.id);
    },
    async message(ws, body) {
      await handlePlayMessage(ws, body);
    },
    async close(ws) {
      await closePlaySocket(ws);
    },
  })
  .ws("/channels/spectate", {
    query: t.Object({ id: t.String() }),
    async open(ws) {
      await openSpectateSocket(ws, ws.data.query.id);
    },
    close(ws) {
      closeSpectateSocket(ws);
    },
  });

await subscribeToLobbyEvents((lobbyId) => {
  void broadcast(lobbyId).catch((error: unknown) =>
    console.error("lobby: broadcast failed", error),
  );
});

setLobbyChangeHandler((lobbyId) => {
  void broadcast(lobbyId).catch((error: unknown) =>
    console.error("lobby: broadcast failed", error),
  );
});

await subscribeToGameEvents((event) => {
  fanOutGameEvent(event);
  if (event.origin !== INSTANCE_ID && event.finishedAt !== null) {
    void broadcast(event.lobbyId).catch((error: unknown) =>
      console.error("lobby: broadcast failed", error),
    );
  }
});

startPresenceFlush();

const server = app.listen(Number(process.env.PORT ?? 8080));

console.log(`Listening on ${server.server!.url}`);
