import prisma from "@100masu/db";
import { cors } from "@elysiajs/cors";
import { Elysia, t } from "elysia";

import { subscribeToLobbyEvents } from "./redis";

type LobbySocket = { send: (data: unknown) => void };

const rooms = new Map<string, Set<LobbySocket>>();
const socketLobby = new Map<LobbySocket, string>();

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
    startedAt: lobby.StartedAt ? lobby.StartedAt.getTime() : null,
    players: lobby.Players.map((player) => ({
      id: player.Id,
      name: player.Name,
      isHost: player.IsHost,
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
  for (const socket of room) {
    socket.send(snapshot);
  }
}

const app = new Elysia()
  .use(cors())
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
        room = new Set();
        rooms.set(lobbyId, room);
      }
      room.add(ws);
      socketLobby.set(ws, lobbyId);
      await broadcast(lobbyId);
    },
    async message(ws) {
      const lobbyId = socketLobby.get(ws);
      if (lobbyId) {
        await broadcast(lobbyId);
      }
    },
    close(ws) {
      const lobbyId = socketLobby.get(ws);
      socketLobby.delete(ws);
      if (!lobbyId) {
        return;
      }
      const room = rooms.get(lobbyId);
      if (!room) {
        return;
      }
      room.delete(ws);
      if (room.size === 0) {
        rooms.delete(lobbyId);
      }
    },
  })
  .listen(8080);

await subscribeToLobbyEvents((lobbyId) => {
  void broadcast(lobbyId);
});

console.log(`Listening on ${app.server!.url}`);
