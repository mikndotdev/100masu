import { deadline, type Color } from "@100masu/reversi";
import { hashIdentity } from "@100masu/reversi/identity";
import {
  clientMessageSchema,
  GAME_EVENTS_CHANNEL,
  type ClientMessage,
  type ErrorMessage,
  type GameEvent,
} from "@100masu/reversi/protocol";
import { Elysia, t } from "elysia";

import { clearPresence, publishJson, subscribeJson, touchPresence } from "../../shared/pubsub";
import { move, requestRematch, resign, settleTimeout } from "./actions";
import { buildState, clockOf, loadGame, type GameRow } from "./state";

const TIMEOUT_SLACK_MS = 50;
const TIMEOUT_RETRY_MS = 1000;

type Socket = { id: string; send: (data: unknown) => void; close: () => void };
type Seat = { playerId: string; color: Color };
type Member = { socket: Socket; seat: Seat | null };

const rooms = new Map<string, Map<string, Member>>();
const socketGame = new Map<string, string>();
const opening = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function refresh(gameId: string) {
  void publishJson(GAME_EVENTS_CHANNEL, { gameId } satisfies GameEvent).catch((error: unknown) =>
    console.error("reversi: publish failed", error),
  );
}

function armTimer(game: GameRow) {
  clearTimeout(timers.get(game.Id));
  timers.delete(game.Id);
  const clock = clockOf(game);
  const turn = game.Turn;
  if (game.Status !== "playing" || !clock || !turn) {
    return;
  }
  const delay = Math.max(0, deadline(clock, turn) - Date.now()) + TIMEOUT_SLACK_MS;
  schedule(game.Id, delay);
}

function schedule(gameId: string, delay: number) {
  timers.set(
    gameId,
    setTimeout(() => {
      timers.delete(gameId);
      void onDeadline(gameId);
    }, delay),
  );
}

async function onDeadline(gameId: string) {
  try {
    if (await settleTimeout(gameId)) {
      refresh(gameId);
      return;
    }
    const current = await loadGame(gameId);
    if (current && rooms.has(gameId)) {
      armTimer(current);
    }
  } catch (error) {
    console.error("reversi: timeout failed", error);
    if (rooms.has(gameId) && !timers.has(gameId)) {
      schedule(gameId, TIMEOUT_RETRY_MS);
    }
  }
}

async function deliver(gameId: string, only?: Member) {
  const room = rooms.get(gameId);
  if (!room || room.size === 0) {
    return;
  }
  const game = await loadGame(gameId);
  if (!game) {
    return;
  }
  const shared = await buildState(game);
  const serverNow = Date.now();
  for (const member of only ? [only] : room.values()) {
    member.socket.send({ ...shared, you: member.seat?.color ?? null, serverNow });
  }
  armTimer(game);
}

function sendError(member: Member, code: ErrorMessage["code"]) {
  member.socket.send({ type: "error", code });
}

async function open(socket: Socket, gameId: string, identity: string | undefined) {
  opening.add(socket.id);
  const game = await loadGame(gameId);
  if (!opening.delete(socket.id)) {
    return;
  }
  if (!game) {
    socket.close();
    return;
  }
  const hash = identity ? hashIdentity(identity) : null;
  const player = hash
    ? game.Players.find((candidate) => candidate.IdentityHash === hash)
    : undefined;
  const member: Member = {
    socket,
    seat: player ? { playerId: player.Id, color: player.Color } : null,
  };

  let room = rooms.get(gameId);
  if (!room) {
    room = new Map();
    rooms.set(gameId, room);
  }
  room.set(socket.id, member);
  socketGame.set(socket.id, gameId);

  if (member.seat) {
    await touchPresence(member.seat.playerId);
  }
  if (await settleTimeout(gameId)) {
    refresh(gameId);
    return;
  }
  await deliver(gameId, member);
  if (member.seat) {
    refresh(gameId);
  }
}

function close(socket: Socket) {
  opening.delete(socket.id);
  const gameId = socketGame.get(socket.id);
  socketGame.delete(socket.id);
  if (!gameId) {
    return;
  }
  const room = rooms.get(gameId);
  const member = room?.get(socket.id);
  room?.delete(socket.id);

  const seat = member?.seat;
  if (
    seat &&
    ![...(room?.values() ?? [])].some((other) => other.seat?.playerId === seat.playerId)
  ) {
    void clearPresence(seat.playerId)
      .then(() => refresh(gameId))
      .catch((error: unknown) => console.error("reversi: presence clear failed", error));
  }

  if (room && room.size === 0) {
    rooms.delete(gameId);
    clearTimeout(timers.get(gameId));
    timers.delete(gameId);
  }
}

function act(gameId: string, seat: Seat, body: Exclude<ClientMessage, { type: "ping" }>) {
  switch (body.type) {
    case "move":
      return move(gameId, seat.color, body.idx, body.version);
    case "resign":
      return resign(gameId, seat.color);
    case "rematch":
      return requestRematch(gameId, seat.playerId);
  }
}

async function handle(socket: Socket, body: ClientMessage) {
  const gameId = socketGame.get(socket.id);
  const member = gameId ? rooms.get(gameId)?.get(socket.id) : undefined;
  if (!gameId || !member) {
    return;
  }

  if (body.type === "ping") {
    if (member.seat && (await touchPresence(member.seat.playerId))) {
      refresh(gameId);
    }
    socket.send({ type: "pong", serverNow: Date.now() });
    return;
  }

  const seat = member.seat;
  if (!seat) {
    sendError(member, "spectator");
    return;
  }

  const failure = await act(gameId, seat, body);

  if (failure) {
    sendError(member, failure);
    await deliver(gameId, member);
    return;
  }
  refresh(gameId);
}

export const reversi = new Elysia({ prefix: "/reversi" }).ws("/channels/game", {
  query: t.Object({ game: t.String(), id: t.Optional(t.String()) }),
  body: clientMessageSchema,
  async open(ws) {
    await open(ws, ws.data.query.game, ws.data.query.id);
  },
  async message(ws, body) {
    await handle(ws, body);
  },
  close(ws) {
    close(ws);
  },
});

export async function startReversi() {
  await subscribeJson<GameEvent>(GAME_EVENTS_CHANNEL, ({ gameId }) => {
    void deliver(gameId).catch((error: unknown) => console.error("reversi: deliver failed", error));
  });
}
