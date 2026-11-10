import prisma from "@100masu/db";

import { publishLobbyEvent } from "./events";

const OPERATION_FROM_DB = { ADD: "add", SUB: "sub", MUL: "mul", DIV: "div" } as const;
const CHECK_FROM_DB = { INPUT: "input", END: "end" } as const;

type LobbySocket = { id: string; send: (data: unknown) => void; close: () => void };

const HOST_GRACE_MS = 10_000;

const rooms = new Map<string, Map<string, LobbySocket>>();
const socketLobby = new Map<string, string>();
const socketPlayer = new Map<string, string>();
const lobbyMembers = new Map<string, Map<string, string>>();
const pendingHostTransfers = new Map<
  string,
  { playerId: string; timer: ReturnType<typeof setTimeout> }
>();

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
    settingsOpen: lobby.SettingsOpen,
    nextLobbyId: lobby.NextLobbyId,
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

function cancelHostTransfer(lobbyId: string, playerId?: string) {
  const pending = pendingHostTransfers.get(lobbyId);
  if (!pending || (playerId !== undefined && pending.playerId !== playerId)) {
    return;
  }
  clearTimeout(pending.timer);
  pendingHostTransfers.delete(lobbyId);
}

async function transferHost(lobbyId: string, departingPlayerId: string) {
  pendingHostTransfers.delete(lobbyId);

  const lobby = await prisma.lobby.findUnique({
    where: { Id: lobbyId },
    select: { Status: true },
  });
  if (!lobby || lobby.Status !== "OPEN") {
    return;
  }

  const connected = [...(lobbyMembers.get(lobbyId)?.values() ?? [])].filter(
    (playerId) => playerId !== departingPlayerId,
  );
  if (connected.length === 0) {
    return;
  }

  const current = await prisma.player.findFirst({
    where: { LobbyId: lobbyId, IsHost: true },
    select: { Id: true },
  });
  if (current && current.Id !== departingPlayerId) {
    return;
  }

  const unique = [...new Set(connected)];
  const chosen = unique[Math.floor(Math.random() * unique.length)];
  if (!chosen) {
    return;
  }

  await prisma.$transaction([
    prisma.player.updateMany({ where: { LobbyId: lobbyId }, data: { IsHost: false } }),
    prisma.player.update({ where: { Id: chosen }, data: { IsHost: true } }),
  ]);

  await notifyLobbyChange(lobbyId);
}

async function scheduleHostTransfer(lobbyId: string, playerId: string) {
  const player = await prisma.player.findUnique({
    where: { Id: playerId },
    select: { IsHost: true, Lobby: { select: { Status: true } } },
  });
  if (!player?.IsHost || player.Lobby.Status !== "OPEN") {
    return;
  }

  cancelHostTransfer(lobbyId);
  pendingHostTransfers.set(lobbyId, {
    playerId,
    timer: setTimeout(() => {
      void transferHost(lobbyId, playerId).catch((error: unknown) =>
        console.error("lobby: host transfer failed", error),
      );
    }, HOST_GRACE_MS),
  });
}

export async function broadcast(lobbyId: string) {
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

export async function notifyLobbyChange(lobbyId: string) {
  await broadcast(lobbyId);
  await publishLobbyEvent(lobbyId).catch((error: unknown) =>
    console.error("lobby: publish failed", error),
  );
}

export async function openLobbySocket(ws: LobbySocket, query: { id?: string; player?: string }) {
  const lobbyId = await resolveLobbyId(query);
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

  const playerId = query.player;
  if (playerId) {
    socketPlayer.set(ws.id, playerId);
    let members = lobbyMembers.get(lobbyId);
    if (!members) {
      members = new Map();
      lobbyMembers.set(lobbyId, members);
    }
    members.set(ws.id, playerId);
    cancelHostTransfer(lobbyId, playerId);
  }

  await broadcast(lobbyId);
}

export async function handleLobbyMessage(ws: LobbySocket) {
  const lobbyId = socketLobby.get(ws.id);
  if (lobbyId) {
    await broadcast(lobbyId);
  }
}

export function closeLobbySocket(ws: LobbySocket) {
  const lobbyId = socketLobby.get(ws.id);
  const playerId = socketPlayer.get(ws.id);
  socketLobby.delete(ws.id);
  socketPlayer.delete(ws.id);
  if (!lobbyId) {
    return;
  }

  const members = lobbyMembers.get(lobbyId);
  if (members) {
    members.delete(ws.id);
    if (members.size === 0) {
      lobbyMembers.delete(lobbyId);
    }
  }

  if (playerId && ![...(members?.values() ?? [])].includes(playerId)) {
    void scheduleHostTransfer(lobbyId, playerId).catch((error: unknown) =>
      console.error("lobby: host transfer scheduling failed", error),
    );
  }

  const room = rooms.get(lobbyId);
  if (!room) {
    return;
  }
  room.delete(ws.id);
  if (room.size === 0) {
    rooms.delete(lobbyId);
  }
}
