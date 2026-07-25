import prisma from "@100masu/db";
import {
  buildCellStates,
  CELL_COUNT,
  countProgress,
  type Board,
  type CheckMode,
  type Operation,
} from "@100masu/game";

import { INSTANCE_ID, publishGameEvent, touchPresence, type GameEvent } from "./redis";

const WRITE_DEBOUNCE_MS = 400;
const PRESENCE_FLUSH_MS = 60_000;
const PRESENCE_THROTTLE_MS = 15_000;

export type GameSocket = { id: string; send: (data: unknown) => void; close: () => void };

type PlayerState = {
  id: string;
  name: string;
  answers: string[];
  filled: number;
  correct: number;
  finishedAt: number | null;
  placement: number | null;
};

type LobbyState = {
  lobbyId: string;
  board: Board;
  op: Operation;
  check: CheckMode;
  startedAt: number | null;
  players: Map<string, PlayerState>;
};

const lobbies = new Map<string, LobbyState>();
const playRooms = new Map<string, Map<string, GameSocket>>();
const spectateRooms = new Map<string, Map<string, GameSocket>>();
const socketPlayer = new Map<string, { lobbyId: string; playerId: string }>();
const closedSockets = new Set<string>();
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const livePlayers = new Set<string>();
const presenceStamps = new Map<string, number>();

const OPERATION_FROM_DB = { ADD: "add", SUB: "sub", MUL: "mul", DIV: "div" } as const;
const CHECK_FROM_DB = { INPUT: "input", END: "end" } as const;

let onLobbyChanged: (lobbyId: string) => void = () => undefined;

export function setLobbyChangeHandler(handler: (lobbyId: string) => void) {
  onLobbyChanged = handler;
}

function answersOf(value: unknown): string[] {
  const cells =
    typeof value === "object" && value !== null && "cells" in value
      ? (value as { cells?: unknown }).cells
      : null;
  const list = Array.isArray(cells) ? cells : [];
  return Array.from({ length: CELL_COUNT }, (_, index) =>
    typeof list[index] === "string" ? (list[index] as string) : "",
  );
}

function markPresence(playerId: string) {
  const last = presenceStamps.get(playerId) ?? 0;
  const now = Date.now();
  if (now - last < PRESENCE_THROTTLE_MS) {
    return;
  }
  presenceStamps.set(playerId, now);
  void touchPresence(playerId).catch(() => undefined);
}

async function loadLobbyState(lobbyId: string): Promise<LobbyState | null> {
  const cached = lobbies.get(lobbyId);
  if (cached) {
    return cached;
  }

  const lobby = await prisma.lobby.findUnique({
    where: { Id: lobbyId },
    include: { Players: { orderBy: { JoinedAt: "asc" } } },
  });
  if (!lobby || lobby.StartedAt === null) {
    return null;
  }

  const raced = lobbies.get(lobbyId);
  if (raced) {
    return raced;
  }

  const state: LobbyState = {
    lobbyId: lobby.Id,
    board: { top: lobby.TopHeaders, left: lobby.LeftHeaders },
    op: OPERATION_FROM_DB[lobby.Op],
    check: CHECK_FROM_DB[lobby.Check],
    startedAt: lobby.StartedAt.getTime(),
    players: new Map(
      lobby.Players.map((player) => [
        player.Id,
        {
          id: player.Id,
          name: player.Name,
          answers: answersOf(player.Answers),
          filled: player.FilledCount,
          correct: player.CorrectCount,
          finishedAt: player.FinishedAt ? player.FinishedAt.getTime() : null,
          placement: null,
        },
      ]),
    ),
  };

  [...state.players.values()]
    .filter((player) => player.finishedAt !== null)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0))
    .forEach((player, index) => {
      player.placement = index + 1;
    });

  lobbies.set(lobbyId, state);
  return state;
}

function revealFor(lobby: LobbyState, player: PlayerState): boolean {
  return lobby.check === "input" || player.finishedAt !== null;
}

function progressOf(lobby: LobbyState, player: PlayerState) {
  return {
    playerId: player.id,
    name: player.name,
    cells: buildCellStates(lobby.board, lobby.op, player.answers, revealFor(lobby, player)),
    filled: player.filled,
    correct: player.correct,
    finishedAt: player.finishedAt,
    placement: player.placement,
  };
}

function evictIfIdle(lobbyId: string) {
  if (!playRooms.has(lobbyId) && !spectateRooms.has(lobbyId)) {
    lobbies.delete(lobbyId);
  }
}

function scheduleWrite(lobbyId: string, playerId: string) {
  const existing = pendingWrites.get(playerId);
  if (existing) {
    clearTimeout(existing);
  }
  pendingWrites.set(
    playerId,
    setTimeout(() => {
      void flushWrite(lobbyId, playerId);
    }, WRITE_DEBOUNCE_MS),
  );
}

function cancelWrite(playerId: string) {
  const timer = pendingWrites.get(playerId);
  if (timer) {
    clearTimeout(timer);
    pendingWrites.delete(playerId);
  }
}

export async function flushWrite(lobbyId: string, playerId: string) {
  cancelWrite(playerId);
  const player = lobbies.get(lobbyId)?.players.get(playerId);
  if (!player || player.finishedAt !== null) {
    return;
  }
  try {
    await prisma.player.update({
      where: { Id: playerId },
      data: {
        Answers: { cells: player.answers },
        FilledCount: player.filled,
        CorrectCount: player.correct,
      },
    });
  } catch (error) {
    console.error("play: failed to persist answers", error);
  }
}

function deliver(event: GameEvent) {
  for (const socket of playRooms.get(event.lobbyId)?.values() ?? []) {
    socket.send({
      type: "progress",
      playerId: event.playerId,
      name: event.name,
      cells: event.cells,
      filled: event.filled,
      correct: event.correct,
      finishedAt: event.finishedAt,
      placement: event.placement,
    });
    if (event.finishedAt !== null && event.placement !== null) {
      socket.send({
        type: "finished",
        playerId: event.playerId,
        name: event.name,
        placement: event.placement,
        timeMs: event.timeMs ?? 0,
      });
    }
  }

  for (const socket of spectateRooms.get(event.lobbyId)?.values() ?? []) {
    socket.send({
      type: "spectateProgress",
      playerId: event.playerId,
      name: event.name,
      answers: event.answers,
      filled: event.filled,
      correct: event.correct,
      finishedAt: event.finishedAt,
    });
  }
}

export function fanOutGameEvent(event: GameEvent) {
  if (event.origin === INSTANCE_ID) {
    return;
  }

  const player = lobbies.get(event.lobbyId)?.players.get(event.playerId);
  if (player) {
    player.answers = event.answers;
    player.filled = event.filled;
    player.correct = event.correct;
    player.finishedAt = event.finishedAt;
    player.placement = event.placement;
  }

  deliver(event);
}

function buildEvent(lobby: LobbyState, player: PlayerState): GameEvent {
  return {
    origin: INSTANCE_ID,
    lobbyId: lobby.lobbyId,
    playerId: player.id,
    name: player.name,
    cells: buildCellStates(lobby.board, lobby.op, player.answers, revealFor(lobby, player)),
    answers: [...player.answers],
    filled: player.filled,
    correct: player.correct,
    finishedAt: player.finishedAt,
    placement: player.placement,
    timeMs:
      player.finishedAt !== null && lobby.startedAt !== null
        ? player.finishedAt - lobby.startedAt
        : null,
  };
}

function announce(lobby: LobbyState, player: PlayerState) {
  const event = buildEvent(lobby, player);
  deliver(event);
  void publishGameEvent(event).catch((error: unknown) =>
    console.error("play: publish failed", error),
  );
}

async function finishPlayer(lobby: LobbyState, player: PlayerState): Promise<boolean> {
  cancelWrite(player.id);
  const finishedAt = new Date();

  try {
    await prisma.player.update({
      where: { Id: player.id },
      data: {
        Answers: { cells: player.answers },
        FilledCount: player.filled,
        CorrectCount: player.correct,
        FinishedAt: finishedAt,
        Status: "FINISHED",
      },
    });
  } catch (error) {
    console.error("play: failed to record finish", error);
    return false;
  }

  const finishedCount = await prisma.player
    .count({ where: { LobbyId: lobby.lobbyId, FinishedAt: { not: null } } })
    .catch(() => null);

  player.finishedAt = finishedAt.getTime();
  player.placement =
    finishedCount ?? [...lobby.players.values()].filter((o) => o.finishedAt !== null).length;

  const unfinished = await prisma.player
    .count({ where: { LobbyId: lobby.lobbyId, FinishedAt: null } })
    .catch(() => 1);
  if (unfinished === 0) {
    await prisma.lobby
      .update({
        where: { Id: lobby.lobbyId },
        data: { Status: "COMPLETED", FinishedAt: finishedAt },
      })
      .catch((error: unknown) => console.error("play: failed to complete lobby", error));
  }

  onLobbyChanged(lobby.lobbyId);
  return true;
}

export async function openPlaySocket(socket: GameSocket, playerId: string) {
  const player = await prisma.player.findUnique({
    where: { Id: playerId },
    select: { LobbyId: true },
  });
  if (!player) {
    socket.close();
    return;
  }

  const lobby = await loadLobbyState(player.LobbyId);
  const self = lobby?.players.get(playerId);
  if (!lobby || !self) {
    socket.close();
    return;
  }

  if (closedSockets.has(socket.id)) {
    closedSockets.delete(socket.id);
    return;
  }

  let room = playRooms.get(lobby.lobbyId);
  if (!room) {
    room = new Map();
    playRooms.set(lobby.lobbyId, room);
  }
  room.set(socket.id, socket);
  socketPlayer.set(socket.id, { lobbyId: lobby.lobbyId, playerId });
  livePlayers.add(playerId);
  markPresence(playerId);

  socket.send({
    type: "game",
    board: lobby.board,
    op: lobby.op,
    check: lobby.check,
    startedAt: lobby.startedAt,
    serverNow: Date.now(),
    you: { id: self.id, answers: self.answers, finishedAt: self.finishedAt },
    players: [...lobby.players.values()].map((other) => progressOf(lobby, other)),
  });

  if (self.finishedAt !== null) {
    socket.send({
      type: "finished",
      playerId: self.id,
      name: self.name,
      placement: self.placement ?? 1,
      timeMs: lobby.startedAt !== null ? self.finishedAt - lobby.startedAt : 0,
    });
  }
}

export async function handlePlayMessage(
  socket: GameSocket,
  body: { type: string; index?: number; value?: string },
) {
  const bound = socketPlayer.get(socket.id);
  if (!bound) {
    return;
  }
  const lobby = lobbies.get(bound.lobbyId);
  const player = lobby?.players.get(bound.playerId);
  if (!lobby || !player) {
    return;
  }

  markPresence(bound.playerId);

  if (body.type === "ping" || player.finishedAt !== null) {
    return;
  }

  if (body.type === "cell") {
    const index = body.index;
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
      return;
    }
    player.answers[index] = typeof body.value === "string" ? body.value.slice(0, 12) : "";

    const progress = countProgress(lobby.board, lobby.op, player.answers);
    player.filled = progress.filled;
    player.correct = progress.correct;

    if (lobby.check === "input" && progress.solved) {
      await finishPlayer(lobby, player);
    } else {
      scheduleWrite(bound.lobbyId, bound.playerId);
    }
    announce(lobby, player);
    return;
  }

  if (body.type === "check") {
    if (lobby.check !== "end") {
      return;
    }
    const progress = countProgress(lobby.board, lobby.op, player.answers);
    if (progress.filled < progress.answerable) {
      return;
    }
    player.filled = progress.filled;
    player.correct = progress.correct;

    if (progress.solved) {
      await finishPlayer(lobby, player);
    } else {
      scheduleWrite(bound.lobbyId, bound.playerId);
    }

    socket.send({
      type: "checkResult",
      cells: buildCellStates(lobby.board, lobby.op, player.answers, true),
      correct: progress.correct,
      answerable: progress.answerable,
      solved: progress.solved,
    });

    announce(lobby, player);
  }
}

export async function closePlaySocket(socket: GameSocket) {
  const bound = socketPlayer.get(socket.id);
  socketPlayer.delete(socket.id);
  if (!bound) {
    closedSockets.add(socket.id);
    return;
  }
  livePlayers.delete(bound.playerId);
  presenceStamps.delete(bound.playerId);

  const room = playRooms.get(bound.lobbyId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      playRooms.delete(bound.lobbyId);
    }
  }
  await flushWrite(bound.lobbyId, bound.playerId);
  evictIfIdle(bound.lobbyId);
}

export async function openSpectateSocket(socket: GameSocket, playerId: string) {
  const player = await prisma.player.findUnique({
    where: { Id: playerId },
    select: { LobbyId: true, FinishedAt: true },
  });

  if (!player || player.FinishedAt === null) {
    socket.close();
    return;
  }

  const lobby = await loadLobbyState(player.LobbyId);
  if (!lobby) {
    socket.close();
    return;
  }

  if (closedSockets.has(socket.id)) {
    closedSockets.delete(socket.id);
    return;
  }

  let room = spectateRooms.get(lobby.lobbyId);
  if (!room) {
    room = new Map();
    spectateRooms.set(lobby.lobbyId, room);
  }
  room.set(socket.id, socket);
  socketPlayer.set(socket.id, { lobbyId: lobby.lobbyId, playerId });

  socket.send({
    type: "spectate",
    board: lobby.board,
    op: lobby.op,
    check: lobby.check,
    startedAt: lobby.startedAt,
    players: [...lobby.players.values()].map((other) => ({
      playerId: other.id,
      name: other.name,
      answers: other.answers,
      filled: other.filled,
      correct: other.correct,
      finishedAt: other.finishedAt,
    })),
  });
}

export function closeSpectateSocket(socket: GameSocket) {
  const bound = socketPlayer.get(socket.id);
  socketPlayer.delete(socket.id);
  if (!bound) {
    closedSockets.add(socket.id);
    return;
  }
  const room = spectateRooms.get(bound.lobbyId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      spectateRooms.delete(bound.lobbyId);
    }
  }
  evictIfIdle(bound.lobbyId);
}

export function startPresenceFlush() {
  setInterval(() => {
    if (livePlayers.size === 0) {
      return;
    }
    const ids = [...livePlayers];
    void prisma.player
      .updateMany({ where: { Id: { in: ids } }, data: { LastPingAt: new Date() } })
      .catch((error: unknown) => console.error("play: presence flush failed", error));
  }, PRESENCE_FLUSH_MS);
}
