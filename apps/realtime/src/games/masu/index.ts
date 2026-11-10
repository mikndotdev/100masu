import { Elysia, t } from "elysia";

import { INSTANCE_ID } from "../../shared/pubsub";
import { createSession, rematch, setSettingsOpen, startGame, updateSettings } from "./discord";
import { subscribeToGameEvents, subscribeToLobbyEvents } from "./events";
import {
  broadcast,
  closeLobbySocket,
  handleLobbyMessage,
  notifyLobbyChange,
  openLobbySocket,
} from "./lobby";
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

export const masu = new Elysia({ prefix: "/masu" })
  .post(
    "/discord/session",
    async ({ body, status }) => {
      const result = await createSession(body);
      if (!result.ok) {
        return status(result.status, { error: result.error });
      }
      return {
        playerId: result.playerId,
        lobbyId: result.lobbyId,
        accessToken: result.accessToken,
        isHost: result.isHost,
        token: result.token,
      };
    },
    {
      body: t.Object({
        code: t.String({ minLength: 1 }),
        instanceId: t.String({ minLength: 1 }),
        channelId: t.Optional(t.String()),
        guildId: t.Optional(t.String()),
      }),
    },
  )
  .patch(
    "/discord/settings",
    async ({ body, status }) => {
      const result = await updateSettings(body);
      if (!result.ok) {
        return status(result.status, { error: result.error });
      }
      await notifyLobbyChange(result.lobbyId);
      return { ok: true };
    },
    {
      body: t.Object({
        playerId: t.String({ minLength: 1 }),
        token: t.String({ minLength: 1 }),
        op: t.Union([t.Literal("add"), t.Literal("sub"), t.Literal("mul"), t.Literal("div")]),
        start: t.Integer(),
        order: t.Union([t.Literal("seq"), t.Literal("rand")]),
        check: t.Union([t.Literal("input"), t.Literal("end")]),
      }),
    },
  )
  .patch(
    "/discord/lobby",
    async ({ body, status }) => {
      const result = await setSettingsOpen(body);
      if (!result.ok) {
        return status(result.status, { error: result.error });
      }
      await notifyLobbyChange(result.lobbyId);
      return { ok: true };
    },
    {
      body: t.Object({
        playerId: t.String({ minLength: 1 }),
        token: t.String({ minLength: 1 }),
        open: t.Boolean(),
      }),
    },
  )
  .post(
    "/discord/start",
    async ({ body, status }) => {
      const result = await startGame(body);
      if (!result.ok) {
        return status(result.status, { error: result.error });
      }
      await notifyLobbyChange(result.lobbyId);
      return { ok: true };
    },
    { body: t.Object({ playerId: t.String({ minLength: 1 }), token: t.String({ minLength: 1 }) }) },
  )
  .post(
    "/discord/rematch",
    async ({ body, status }) => {
      const result = await rematch(body);
      if (!result.ok) {
        return status(result.status, { error: result.error });
      }
      await notifyLobbyChange(result.previousLobbyId);
      return { lobbyId: result.lobbyId };
    },
    { body: t.Object({ playerId: t.String({ minLength: 1 }), token: t.String({ minLength: 1 }) }) },
  )
  .ws("/channels/lobby", {
    query: t.Object({ id: t.Optional(t.String()), player: t.Optional(t.String()) }),
    async open(ws) {
      await openLobbySocket(ws, ws.data.query);
    },
    async message(ws) {
      await handleLobbyMessage(ws);
    },
    close(ws) {
      closeLobbySocket(ws);
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

export async function startMasu() {
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
}
