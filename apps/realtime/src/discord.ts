import prisma from "@100masu/db";
import { env } from "@100masu/env/server";
import { generateHeaders, INTRO_MS, MAX_PLAYERS, type Order } from "@100masu/game";

const TOKEN_URL = "https://discord.com/api/oauth2/token";
const USER_URL = "https://discord.com/api/users/@me";
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LOBBY_TTL_MS = 1000 * 60 * 60 * 6;

export type DiscordUser = {
  id: string;
  name: string;
  avatar: string | null;
};

export type Failure = { ok: false; error: string; status: number };

type Session = {
  ok: true;
  playerId: string;
  lobbyId: string;
  accessToken: string;
  isHost: boolean;
};

const ORDER_FROM_DB: Record<string, Order> = { SEQ: "seq", RAND: "rand" };

const OPERATION_TO_DB = {
  add: "ADD",
  sub: "SUB",
  mul: "MUL",
  div: "DIV",
} as const;

function inviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (const byte of bytes) {
    code += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
  }
  return code;
}

function fail(error: string, status: number): Failure {
  return { ok: false, error, status };
}

async function exchangeCode(code: string): Promise<string | Failure> {
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("unconfigured", 503);
  }

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });
  } catch (error) {
    console.error("discord: token endpoint unreachable", error);
    return fail("unreachable", 502);
  }

  if (!response.ok) {
    console.error("discord: token exchange rejected", response.status, await response.text());
    return fail("rejected", 502);
  }

  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string") {
    console.error("discord: token response missing access_token");
    return fail("rejected", 502);
  }
  return payload.access_token;
}

async function fetchUser(accessToken: string): Promise<DiscordUser | Failure> {
  let response: Response;
  try {
    response = await fetch(USER_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  } catch (error) {
    console.error("discord: users/@me unreachable", error);
    return fail("unreachable", 502);
  }

  if (!response.ok) {
    console.error("discord: users/@me rejected", response.status);
    return fail("rejected", 502);
  }

  const payload = (await response.json()) as {
    id?: unknown;
    username?: unknown;
    global_name?: unknown;
    avatar?: unknown;
  };

  if (typeof payload.id !== "string" || typeof payload.username !== "string") {
    return fail("rejected", 502);
  }

  const globalName = typeof payload.global_name === "string" ? payload.global_name : null;
  return {
    id: payload.id,
    name: (globalName ?? payload.username).slice(0, 20),
    avatar: typeof payload.avatar === "string" ? payload.avatar : null,
  };
}

async function findOrCreateLobby(instanceId: string, channelId?: string, guildId?: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const existing = await prisma.lobby.findUnique({
      where: { DiscordInstanceId: instanceId },
      include: { Players: true },
    });
    if (existing) {
      return existing;
    }
    try {
      return await prisma.lobby.create({
        data: {
          InviteCode: inviteCode(),
          DiscordInstanceId: instanceId,
          DiscordChannelId: channelId ?? null,
          DiscordGuildId: guildId ?? null,
          MaxPlayers: MAX_PLAYERS,
          AllowLateJoin: true,
          ExpiresAt: new Date(Date.now() + LOBBY_TTL_MS),
        },
        include: { Players: true },
      });
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
  return null;
}

export async function createSession(input: {
  code: string;
  instanceId: string;
  channelId?: string;
  guildId?: string;
}): Promise<Session | Failure> {
  const accessToken = await exchangeCode(input.code);
  if (typeof accessToken !== "string") {
    return accessToken;
  }

  const user = await fetchUser(accessToken);
  if ("ok" in user) {
    return user;
  }

  const lobby = await findOrCreateLobby(input.instanceId, input.channelId, input.guildId);
  if (!lobby) {
    return fail("lobbyUnavailable", 500);
  }

  const existing = lobby.Players.find((player) => player.DiscordUserId === user.id);
  if (existing) {
    await prisma.player.update({
      where: { Id: existing.Id },
      data: { Name: user.name, DiscordAvatar: user.avatar },
    });
    return {
      ok: true,
      playerId: existing.Id,
      lobbyId: lobby.Id,
      accessToken,
      isHost: existing.IsHost,
    };
  }

  if (lobby.Players.length >= lobby.MaxPlayers) {
    return fail("full", 409);
  }
  if (lobby.Status === "COMPLETED") {
    return fail("closed", 409);
  }

  const isHost = !lobby.Players.some((player) => player.IsHost);
  const player = await prisma.player.create({
    data: {
      LobbyId: lobby.Id,
      Name: user.name,
      DiscordUserId: user.id,
      DiscordAvatar: user.avatar,
      IsHost: isHost,
      Status: lobby.Status === "IN_PROGRESS" ? "PLAYING" : "JOINED",
    },
  });

  return { ok: true, playerId: player.Id, lobbyId: lobby.Id, accessToken, isHost };
}

async function loadActor(playerId: string) {
  return prisma.player.findUnique({
    where: { Id: playerId },
    include: { Lobby: true },
  });
}

export async function updateSettings(input: {
  playerId: string;
  op: "add" | "sub" | "mul" | "div";
  start: number;
  order: "seq" | "rand";
  check: "input" | "end";
}): Promise<{ ok: true; lobbyId: string } | Failure> {
  const actor = await loadActor(input.playerId);
  if (!actor) {
    return fail("notFound", 404);
  }
  if (actor.Lobby.Status !== "OPEN") {
    return fail("alreadyStarted", 409);
  }
  if (!actor.IsHost && !actor.Lobby.SettingsOpen) {
    return fail("notHost", 403);
  }

  await prisma.lobby.update({
    where: { Id: actor.LobbyId },
    data: {
      Op: OPERATION_TO_DB[input.op],
      StartNumber: input.start,
      EndNumber: input.start + 9,
      Order: input.order === "rand" ? "RAND" : "SEQ",
      Check: input.check === "end" ? "END" : "INPUT",
    },
  });

  return { ok: true, lobbyId: actor.LobbyId };
}

export async function setSettingsOpen(input: {
  playerId: string;
  open: boolean;
}): Promise<{ ok: true; lobbyId: string } | Failure> {
  const actor = await loadActor(input.playerId);
  if (!actor) {
    return fail("notFound", 404);
  }
  if (!actor.IsHost) {
    return fail("notHost", 403);
  }
  if (actor.Lobby.Status !== "OPEN") {
    return fail("alreadyStarted", 409);
  }

  await prisma.lobby.update({
    where: { Id: actor.LobbyId },
    data: { SettingsOpen: input.open },
  });

  return { ok: true, lobbyId: actor.LobbyId };
}

export async function startGame(input: {
  playerId: string;
}): Promise<{ ok: true; lobbyId: string } | Failure> {
  const actor = await loadActor(input.playerId);
  if (!actor) {
    return fail("notFound", 404);
  }
  if (!actor.IsHost) {
    return fail("notHost", 403);
  }
  if (actor.Lobby.Status !== "OPEN") {
    return fail("alreadyStarted", 409);
  }

  const order = ORDER_FROM_DB[actor.Lobby.Order] ?? "seq";
  await prisma.lobby.update({
    where: { Id: actor.LobbyId },
    data: {
      Status: "IN_PROGRESS",
      StartedAt: new Date(Date.now() + INTRO_MS),
      TopHeaders: generateHeaders(actor.Lobby.StartNumber, order),
      LeftHeaders: generateHeaders(actor.Lobby.StartNumber, order),
      Players: {
        updateMany: { where: { LobbyId: actor.LobbyId }, data: { Status: "PLAYING" } },
      },
    },
  });

  return { ok: true, lobbyId: actor.LobbyId };
}

export async function rematch(input: {
  playerId: string;
}): Promise<{ ok: true; lobbyId: string; previousLobbyId: string } | Failure> {
  const actor = await loadActor(input.playerId);
  if (!actor) {
    return fail("notFound", 404);
  }

  const previous = actor.Lobby;
  if (previous.Status !== "COMPLETED") {
    return fail("notFinished", 409);
  }
  if (previous.NextLobbyId) {
    return { ok: true, lobbyId: previous.NextLobbyId, previousLobbyId: previous.Id };
  }
  if (!previous.DiscordInstanceId) {
    return fail("notDiscord", 409);
  }

  const instanceId = previous.DiscordInstanceId;
  const created = await prisma.$transaction(async (tx) => {
    await tx.lobby.update({
      where: { Id: previous.Id },
      data: { DiscordInstanceId: null },
    });
    const next = await tx.lobby.create({
      data: {
        InviteCode: inviteCode(),
        DiscordInstanceId: instanceId,
        DiscordChannelId: previous.DiscordChannelId,
        DiscordGuildId: previous.DiscordGuildId,
        MaxPlayers: previous.MaxPlayers,
        AllowLateJoin: true,
        SettingsOpen: previous.SettingsOpen,
        Op: previous.Op,
        StartNumber: previous.StartNumber,
        EndNumber: previous.EndNumber,
        Order: previous.Order,
        Check: previous.Check,
        ExpiresAt: new Date(Date.now() + LOBBY_TTL_MS),
      },
    });
    await tx.lobby.update({
      where: { Id: previous.Id },
      data: { NextLobbyId: next.Id },
    });
    return next;
  });

  return { ok: true, lobbyId: created.Id, previousLobbyId: previous.Id };
}
